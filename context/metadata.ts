import { BigMapAbstraction } from "@taquito/taquito";

async function fetchVersion(metadata: BigMapAbstraction): Promise<string> {
    try {
        let metar: string | undefined = await metadata!.get("version");
        return metar!
    } catch {
        return "unknown version"
    }
}
export default fetchVersion
