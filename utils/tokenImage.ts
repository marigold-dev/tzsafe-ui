import { THUMBNAIL_URL } from "../context/config";

export function toImageUri(imageUri: string | undefined) {
  imageUri = imageUri?.includes("ipfs")
    ? `${THUMBNAIL_URL}/${imageUri.replace("ipfs://", "")}`
    : imageUri;
  return imageUri;
}
