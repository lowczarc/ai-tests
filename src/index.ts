import fs from "fs";
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
        console.error("Usage: ai-tests <file>");
        process.exit(1);
    }
    const fileContent = fs.readFileSync(filePath, "utf8");
    const name = filePath.split("/").pop() || "";
    const [_, ext] = getNameExt(name);
    const file = [{ path: filePath, name, content: fileContent }];
    const res = await generateReferenceForEachFile(file);

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
            description: acc[e.originalPath] ? acc[e.originalPath].description + "\n" + e.reference_json.description : e.reference_json.description,
            references: acc[e.originalPath] ? [...acc[e.originalPath].references || [], ...e.reference_json.references] : e.reference_json.references,
            examples: acc[e.originalPath] ? [...acc[e.originalPath].examples || [], ...e.reference_json.examples] : e.reference_json.examples,
        }
    }), {});


    const splittedRefs = splitString(references(ref[filePath].references), 1000);

    const result = await Promise.all(splittedRefs.map(async (splittedRef: string) => generate(`Generate test in ${extensions[ext]} for this: \`\`\`${splittedRef}\`\`\`\nThe tests should be complete and be launchable\nDon't just create boilerplate\nOnly answer with a single code block containing the ${extensions[ext]} code. Don't write anything else.`).then(res => res.replace(/^(.|\s)*?```[a-zA-Z]*\s?/m, "").replace(/```[^`]*?$/m, "")))).then(res => res.join("\n\n"));

    const tests = result;

    console.log(tests);
})();
