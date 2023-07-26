import fs from "fs";
import ora from "ora";
import { generate, splitString } from "polyfact";
import { generateReferenceForEachFile } from "ai-docs";

const extensions: Record<string, string> = {
    "js": "Javascript",
    "jsx": "React",
    "ts": "Typescript",
    "tsx": "React with Typescript",
    "py": "Python",
    "rb": "Ruby",
    "java": "Java",
    "php": "PHP",
    "cs": "C#",
    "go": "Go",
    "rs": "Rust",
    "cpp": "C++",
    "c": "C",
    "swift": "Swift",
    "kt": "Kotlin",
    "scala": "Scala",
    "dart": "Dart",
    "lua": "Lua",
    "r": "R",
    "vb": "Visual Basic",
    "sql": "SQL",
    "pl": "Perl",
    "hs": "Haskell",
    "ml": "OCaml",
};

function getNameExt(path: string): [string, string] {
    const parts = path.split(".");
    const ext = parts.pop();
    return [parts.join("."), ext || ""];
}

function getNameChunk(name: string): [string, number] {
    const parts = name.split("_");
    const chunk_nb = parts.pop();
    const isChunk = parts.pop();

    if (isChunk !== "chunk") {
        return [name, 1];
    }

    return [parts.join("_"), parseInt(chunk_nb || "1")];
}

function references(refs: any, prefix = ""): string {
    return refs.map((e: any) => {
        const title = `${e.name} (${e.category})`
        const description = e.description ? `\t${e.description}` : "";
        const prototype = e.prototype ? `\t\`${e.prototype}\`` : "";
        const params = e.parameters ? `\tParams:\n${e.parameters.map((p: any) => `${prefix}\t\t${p.name} (${p.type})`).join("\n")}` : "";
        const returns = e.returns ? `\tReturns: ${e.returns.type}` : "";
        const subreferences = e.subreferences ? `\n${references(e.subreferences, prefix + "\t")}` : "";

        return [title, prototype, description, params, returns, subreferences].filter(e => e).map(e => `${prefix}${e}`).join("\n");
    }).join("\n\n");
}

(async () => {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Usage: ai-tests <input_file>");
        process.exit(1);
    }

    const spinner = ora("Loading file").start();
    const fileContent = fs.readFileSync(filePath, "utf8");
    const filename = filePath.split("/").pop() || "";
    const [_, ext] = getNameExt(filename);
    const language = extensions[ext];

    const file = [{ path: filePath, name: filename, content: fileContent }];

    // We don't want the logs from ai-docs. Since we are using stdout to send the result back,
    // we need to disable it
    const stdout = process.stdout.write;
    process.stdout.write = () => true;

    spinner.text = "Generating references";
    const res = await generateReferenceForEachFile(file);

    // We restore the stdout
    process.stdout.write = stdout;

    // For some reason the chunks are not merged by ai-docs
    // So we need to merge them manually
    spinner.text = "Merging chunks";
    const ref = res.map((e: any) => {
        if (!e.chunkTotal || e.chunkTotal <= 1) {
            return e;
        }

        const [nameWithChunk, ext] = getNameExt(e.originalPath);

        const [name, chunk] = getNameChunk(nameWithChunk);

        e.originalPath = `${name}.${ext}`;
        e.chunk = chunk;

        return e;
    }).reduce((acc: any, e: any) => ({
        ...acc,
        [e.originalPath]: {
            description: acc[e.originalPath] ?
                acc[e.originalPath].description + "\n" + e.reference_json.description
                    : e.reference_json.description,
            references: acc[e.originalPath] ?
                [...acc[e.originalPath].references || [], ...e.reference_json.references]
                    : e.reference_json.references,
            examples: acc[e.originalPath] ?
                [...acc[e.originalPath].examples || [], ...e.reference_json.examples]
                    : e.reference_json.examples,
        }
    }), {});

    // We split the references in multiple parts to stay under 1000 tokens
    spinner.text = "Splitting references";
    const splittedRefs = splitString(references(ref[filePath].references), 1000);

    // We generate the tests for each splitted references and merge them together
    spinner.text = "Generating tests";
    const result = await Promise.all(
        splittedRefs
            .map(async (splittedRef: string) =>
                 generate(`Generate test in ${language} for this: \`\`\`${splittedRef}\`\`\`\nThe tests should be complete and be launchable\nDon't just create boilerplate\nOnly answer with a single code block containing the ${language} code. Don't write anything else.`)
                .then(res => res
                      .replace(/^(.|\n)*?```[a-zA-Z]*\s?/m, "")
                      .replace(/```[^`]*?$/m, "") // We remove the code block and any text before and after if there is any
        ))).then(res => res.join("\n\n"));

    spinner.succeed("Tests generated");

    const tests = result;

    // We print the tests
    console.log(tests);
})();
