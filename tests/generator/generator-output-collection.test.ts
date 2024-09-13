import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { GeneratorManager, GeneratedContentManager, Target } from '../../src/generator/generated-content-manager'
import { using } from '../../src/testing'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { EmptyFileSystem, Grammar, LangiumDocument, URI } from 'langium'
import { createLangiumGrammarServices } from 'langium/grammar'
import { parseHelper } from 'langium/test'

describe('GeneratorOutputCollector', () => {
  let document: LangiumDocument<Grammar>
  let document2: LangiumDocument<Grammar>
  let model: Grammar
  let model2: Grammar
  beforeAll(async () => {
    const services = createLangiumGrammarServices(EmptyFileSystem)
    const parse = parseHelper<Grammar>(services.grammar);
    document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        A: a=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `, { validation: true, documentUri: "file:///workspace/dir/doc1.langium" })
    model = document.parseResult.value
    document2 = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        A: a=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `, { validation: true, documentUri: "file:///workspace/dir/doc2.langium" })
    model2 = document2.parseResult.value
  })

  describe('Collecting content', () => {
    test('Generating without workspace', () => {
      const model = document.parseResult.value
      const manager = new GeneratedContentManager()
      using(manager.generatorManagerFor(model), output => {
        expect(output.getModel()).toBe(model)
        expect(output.getDocument()).toBe(document)
        expect(output.getWorkspaceURI()).toBeUndefined()
        expect(output.getDocumentLocalPath()).toBeUndefined()
      })
    })

    test('Generating with document outside of workspace', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
      }

      const model = document.parseResult.value
      const workspaceURI1 = URI.parse('file:///tmp1')
      const workspaceURI2 = URI.parse('file:///tmp2')
      const manager = new GeneratedContentManager([workspaceURI1, workspaceURI2])
      using(manager.generatorManagerFor(model), output => {
        expect(output.getModel()).toBe(model)
        expect(output.getDocument()).toBe(document)
        expect(output.getWorkspaceURI()).toBeUndefined()
        expect(output.getDocumentLocalPath()).toBeUndefined()
      })
      generator(manager.generatorManagerFor(model))
      expect(manager.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: document.uri.toString(),
        overwrite: true
      })
    })

    test('Generating with document in workspace', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
      }

      const model = document.parseResult.value
      const workspaceURI = URI.parse('file:///workspace')
      const otherWorkspaceURI = URI.parse('file:///other-workspace')
      const manager = new GeneratedContentManager([workspaceURI, otherWorkspaceURI])
      using(manager.generatorManagerFor(model), output => {
        expect(output.getModel()).toBe(model)
        expect(output.getDocument()).toBe(document)
        expect(output.getWorkspaceURI()).toBe(workspaceURI)
        expect(output.getDocumentLocalPath()).toBe('/dir/doc1.langium')
      })
      generator(manager.generatorManagerFor(model))
      expect(manager.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate no files', () => {
      const manager = new GeneratedContentManager()
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(0)
    })

    test('Generate 1 file', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
      }

      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      expect(manager.getGeneratedContent().size).toBe(1)
      expect(manager.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate 2 files', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file2', 'Model content2')
      }

      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(2)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate 2 files with overwrite', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1', false)
        generatorManager.createFile('path/to/file2', 'Model content2', true)
      }

      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(2)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: false
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate 2 files from 2 dsls', () => {
      function generator(name: string, generatorManager: GeneratorManager): void {
        generatorManager.createFile(`path/to/${name}`, `Model ${name}`)
      }

      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator("dsl1", manager.generatorManagerFor(model))
      generator("dsl2", manager.generatorManagerFor(model2))

      const content = manager.getGeneratedContent()
      expect(content.size).toBe(2)
      expect(content.get('path/to/dsl1')).toStrictEqual({
        content: 'Model dsl1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/dsl2')).toStrictEqual({
        content: 'Model dsl2',
        documentPath: '/dir/doc2.langium',
        overwrite: true
      })
    })

    test('Generate multiple files', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file2', 'Model content2')
        generatorManager.createFile('path/to/file3', 'Model content3', true)
        generatorManager.createFile('path/to/file4', 'Model content4', false)
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(4)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file3')).toStrictEqual({
        content: 'Model content3',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file4')).toStrictEqual({
        content: 'Model content4',
        documentPath: '/dir/doc1.langium',
        overwrite: false
      })
    })

    test('Generate multiple files from multiple dsls', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file2', 'Model content2')
        generatorManager.createFile('path/to/file3', 'Model content3', true)
        generatorManager.createFile('path/to/file4', 'Model content4', false)
      }
      function generator2(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file5', 'Model content5')
        generatorManager.createFile('path/to/file6', 'Model content6')
        generatorManager.createFile('path/to/file7', 'Model content7', true)
        generatorManager.createFile('path/to/file8', 'Model content8', false)
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      generator2(manager.generatorManagerFor(model2))

      const content = manager.getGeneratedContent()
      expect(content.size).toBe(8)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file3')).toStrictEqual({
        content: 'Model content3',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file4')).toStrictEqual({
        content: 'Model content4',
        documentPath: '/dir/doc1.langium',
        overwrite: false
      })
      expect(content.get('path/to/file5')).toStrictEqual({
        content: 'Model content5',
        documentPath: '/dir/doc2.langium',
        overwrite: true
      })
      expect(content.get('path/to/file6')).toStrictEqual({
        content: 'Model content6',
        documentPath: '/dir/doc2.langium',
        overwrite: true
      })
      expect(content.get('path/to/file7')).toStrictEqual({
        content: 'Model content7',
        documentPath: '/dir/doc2.langium',
        overwrite: true
      })
    })

    test('Same file with same content are ok', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file1', 'Model content1')
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(1)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Same file with different content are not ok - same dsl', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file1', 'Model content2')
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      expect(() => {
        generator(manager.generatorManagerFor(model))
      }).toThrowError('ERROR generating /dir/doc1.langium -> path/to/file1: File with different content was already generated from /dir/doc1.langium')
    })

    test('Same file with different content are not ok - different dsl', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
      }
      function generator2(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content2')
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      expect(() => {
        generator2(manager.generatorManagerFor(model))
      }).toThrowError('ERROR generating /dir/doc1.langium -> path/to/file1: File with different content was already generated from /dir/doc1.langium')
    })

    test('Same file with different overwrite are not ok', () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1', true)
      }
      function generator2(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1', false)
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      expect(() => {
        generator2(manager.generatorManagerFor(model))
      }).toThrowError('ERROR generating /dir/doc1.langium -> path/to/file1: File with different overwrite flag was already generated from /dir/doc1.langium')
    })
  })

  describe('Creating files', () => {
    let tmpDir: string
    let tmpDir2: string

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'langium-tools-generator-test-tmp1-'))
      tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'langium-tools-generator-test-tmp2-'))
    })

    describe('Single output directory', () => {

      afterEach(() => {
        [tmpDir, tmpDir2].forEach(dir => {
          if (fs.existsSync(dir)) {
            // Ensure we removing only .dsl and .js files and the directory itself
            fs.readdirSync(dir, { withFileTypes: true }).forEach((file) => {
              const ext = path.extname(file.name)
              if (ext !== '.dsl' && ext !== '.js' && !file.isDirectory()) {
                throw new Error(`Unexpected file found in tmp directory: ${file}`)
              }
            })
            fs.rmSync(dir, { recursive: true })
          }
        })
      })

      test('No files to create - dir get created', () => {
        const manager = new GeneratedContentManager()
        manager.writeToDisk(tmpDir)
        expect(fs.readdirSync(tmpDir)).toStrictEqual([])
      })

      test('No files to create - dir get created recursively', () => {
        const manager = new GeneratedContentManager()
        const workspacePath = path.join(tmpDir, 'path', 'to')
        manager.writeToDisk(workspacePath)
        expect(fs.readdirSync(workspacePath)).toStrictEqual([])
      })

      test('Create 1 file', () => {
        const manager = new GeneratedContentManager()
        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// Model content1')
        manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
      })

      test('Create 1 file in a subdirectory', () => {
        const manager = new GeneratedContentManager()
        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('path/to/file1.js', '// Model content1')
        manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file1.js'), 'utf8')).toBe('// Model content1')
      })

      test('Create 1 file without overwrite', () => {
        const filePath1 = path.join(tmpDir, 'file1.js')
        fs.writeFileSync(filePath1, '// Existing content 1')
        const filePath2 = path.join(tmpDir, 'file2.js')
        fs.writeFileSync(filePath2, '// Existing content 2')

        const manager = new GeneratedContentManager()
        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// New content1', false)
        generatorManager.createFile('file2.js', '// New content2', true)
        manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(filePath1, 'utf8')).toBe('// Existing content 1')
        expect(fs.readFileSync(filePath2, 'utf8')).toBe('// New content2')
      })

      test('Overwriting with same content preverves last modified time', async () => {
        const filePath1 = path.join(tmpDir, 'file1.js')
        fs.writeFileSync(filePath1, '// Existing content 1')
        const filePath2 = path.join(tmpDir, 'file2.js')
        fs.writeFileSync(filePath2, '// Existing content 2')

        const lastModified1 = fs.statSync(filePath1).mtimeMs
        const lastModified2 = fs.statSync(filePath2).mtimeMs

        // Wait for 10 milliseconds to ensure that the last modified time is different
        await new Promise(resolve => setTimeout(resolve, 10))

        const manager = new GeneratedContentManager()
        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// Existing content 1', true)
        generatorManager.createFile('file2.js', '// New content2', true)
        manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(filePath1, 'utf8')).toBe('// Existing content 1')
        expect(fs.readFileSync(filePath2, 'utf8')).toBe('// New content2')
        expect(fs.statSync(filePath1).mtimeMs).toBe(lastModified1)
        expect(fs.statSync(filePath2).mtimeMs).toBeGreaterThan(lastModified2)
      })

      test('Create multiple files and directories', () => {
        function generator(generatorManager: GeneratorManager): void {
          generatorManager.createFile('file1.js', '// Model content1')
          generatorManager.createFile('path/to/file2.js', '// Model content2')
          generatorManager.createFile('path/to/file3.js', '// Model content3', true)
          generatorManager.createFile('path/to/file4.js', '// Model content4', false)
        }
        const workspaceURI = URI.parse('file:///workspace')
        const manager = new GeneratedContentManager([workspaceURI])
        generator(manager.generatorManagerFor(model))
        manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file2.js'), 'utf8')).toBe('// Model content2')
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file3.js'), 'utf8')).toBe('// Model content3')
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file4.js'), 'utf8')).toBe('// Model content4')
        expect(fs.readdirSync(tmpDir, { recursive: true }).length).toBe(4 + 2)
      })
    })

    describe("Multiple output directories", () => {
      test('Use second outlet', () => {
        const TARGET_SRC: Target = { name: "SRC" }

        const manager = new GeneratedContentManager()
        manager.addTarget(TARGET_SRC, false)

        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// Model content1', { target: TARGET_SRC })
        generatorManager.createFile('file2.js', '// Model content2')

        manager.writeToDisk(tmpDir)
        manager.writeToDisk(tmpDir2, TARGET_SRC)

        expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
        expect(fs.readFileSync(path.join(tmpDir2, 'file2.js'), 'utf8')).toBe('// Model content2')
        // TODO check file1 is missing in tmpDir2
      })
    })
  })
})

