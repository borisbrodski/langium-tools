import { URI } from "langium";

/**
 * Return workspace folder {URI} (if found) matching the document URI.
 *
 * @param {URI} [documentURI] document URI
 * @param {URI[]} [workspaceURIs] a list of workspace URIs to consider. Optional
 * @returns {URI} one of the URIs from <code>workspaceURIs</code> or <code>undefined</code>, if the document couldn't be matched to any workspaces.
 */
export function getWorkspaceForDocument(documentURI?: URI, workspaceURIs?: URI[]): URI | undefined {
  return workspaceURIs?.find(workspaceURI => {
    return documentURI?.toString().startsWith(workspaceURI.toString());
  });
}
