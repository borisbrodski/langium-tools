import { URI } from "langium";
import { describe, expect, it } from "vitest";
import { getWorkspaceForDocument } from '../../src/generator'

describe("getWorkspaceForDocument", () => {
  it("undefined if workspace folders are undefined", () => {
    expect(getWorkspaceForDocument(URI.parse("/tmp/document.dsl"))).toBeUndefined()
  })
  it("undefined if workspace folders are empty", () => {
    expect(getWorkspaceForDocument(URI.parse("/tmp/document.dsl"), [])).toBeUndefined()
  })
  it("undefined if workspace folders (1) are not matched", () => {
    expect(getWorkspaceForDocument(URI.parse("/tmp/document.dsl"), [
      URI.parse('/home/usr/')
    ])).toBeUndefined()
  })
  it("undefined if workspace folders (2) are not matched", () => {
    expect(getWorkspaceForDocument(URI.parse("/tmp/document.dsl"), [
      URI.parse('/home/usr/'),
      URI.parse('/usr/share/')
    ])).toBeUndefined()
  })
  it("undefined if document URI undefined", () => {
    expect(getWorkspaceForDocument(undefined, [
      URI.parse('/home/usr/'),
      URI.parse('/usr/share/')
    ])).toBeUndefined()
  })
  it("URI if one workspace folder (1) matches", () => {
    expect(getWorkspaceForDocument(URI.parse("/tmp/document.dsl"), [
      URI.parse('/tmp/'),
    ])?.toString()).toBe('file:///tmp/')
  })
  it("URI if one workspace folder (3) matches", () => {
    expect(getWorkspaceForDocument(URI.parse("/tmp2/document.dsl"), [
      URI.parse('/tmp1/'),
      URI.parse('/tmp2/'),
      URI.parse('/tmp3/'),
    ])?.toString()).toBe('file:///tmp2/')
  })
  it("URI if more workspace folders match", () => {
    expect(getWorkspaceForDocument(URI.parse("/tmp2/document.dsl"), [
      URI.parse('/tmp1/'),
      URI.parse('/tmp2/'),
      URI.parse('/tmp2/'),
      URI.parse('/tmp2/'),
      URI.parse('/tmp3/'),
    ])?.toString()).toBe('file:///tmp2/')
  })
})
