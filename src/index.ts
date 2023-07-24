import fs from "fs";
import * as t from "io-ts";
import { generate } from "polyfact";
import { generateReferenceForEachFile } from "ai-docs";

import { getJSONFolderRepresentation } from "./folder_to_json";

(async () => {
    const folderRoot = process.argv[2];
    if (!folderRoot) {
        console.error("Usage: ai-tests <folder>");
        process.exit(1);
    }
    const res = await generateReferenceForEachFile(await getJSONFolderRepresentation(folderRoot), (ref) => console.log(ref.originalPath));
    fs.writeFileSync("ai-tests.json", JSON.stringify(res, null, 2));
})();
