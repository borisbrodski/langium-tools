import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { GeneratorOutput, GeneratorOutputCollector } from '../../src/generator/generator-output-collector'
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
      const collector = new GeneratorOutputCollector()
      using(collector.generatorOutputFor(model), output => {
        expect(output.getModel()).toBe(model)
        expect(output.getDocument()).toBe(document)
        expect(output.getWorkspaceURI()).toBeUndefined()
        expect(output.getDocumentLocalPath()).toBeUndefined()
      })
    })

    test('Generating with document outside of workspace', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
      }

      const model = document.parseResult.value
      const workspaceURI1 = URI.parse('file:///tmp1')
      const workspaceURI2 = URI.parse('file:///tmp2')
      const collector = new GeneratorOutputCollector([workspaceURI1, workspaceURI2])
      using(collector.generatorOutputFor(model), output => {
        expect(output.getModel()).toBe(model)
        expect(output.getDocument()).toBe(document)
        expect(output.getWorkspaceURI()).toBeUndefined()
        expect(output.getDocumentLocalPath()).toBeUndefined()
      })
      generator(collector.generatorOutputFor(model))
      expect(collector.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: document.uri.toString(),
        overwrite: true
      })
    })

    test('Generating with document in workspace', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
      }

      const model = document.parseResult.value
      const workspaceURI = URI.parse('file:///workspace')
      const otherWorkspaceURI = URI.parse('file:///other-workspace')
      const collector = new GeneratorOutputCollector([workspaceURI, otherWorkspaceURI])
      using(collector.generatorOutputFor(model), output => {
        expect(output.getModel()).toBe(model)
        expect(output.getDocument()).toBe(document)
        expect(output.getWorkspaceURI()).toBe(workspaceURI)
        expect(output.getDocumentLocalPath()).toBe('/dir/doc1.langium')
      })
      generator(collector.generatorOutputFor(model))
      expect(collector.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate no files', () => {
      const collector = new GeneratorOutputCollector()
      const content = collector.getGeneratedContent()
      expect(content.size).toBe(0)
    })

    test('Generate 1 file', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
      }

      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      expect(collector.getGeneratedContent().size).toBe(1)
      expect(collector.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate 2 files', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
        generatorOutput.createFile('path/to/file2', 'Model content2')
      }

      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      const content = collector.getGeneratedContent()
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
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1', false)
        generatorOutput.createFile('path/to/file2', 'Model content2', true)
      }

      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      const content = collector.getGeneratedContent()
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
      function generator(name: string, generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile(`path/to/${name}`, `Model ${name}`)
      }

      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator("dsl1", collector.generatorOutputFor(model))
      generator("dsl2", collector.generatorOutputFor(model2))

      const content = collector.getGeneratedContent()
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
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
        generatorOutput.createFile('path/to/file2', 'Model content2')
        generatorOutput.createFile('path/to/file3', 'Model content3', true)
        generatorOutput.createFile('path/to/file4', 'Model content4', false)
      }
      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      const content = collector.getGeneratedContent()
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
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
        generatorOutput.createFile('path/to/file2', 'Model content2')
        generatorOutput.createFile('path/to/file3', 'Model content3', true)
        generatorOutput.createFile('path/to/file4', 'Model content4', false)
      }
      function generator2(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file5', 'Model content5')
        generatorOutput.createFile('path/to/file6', 'Model content6')
        generatorOutput.createFile('path/to/file7', 'Model content7', true)
        generatorOutput.createFile('path/to/file8', 'Model content8', false)
      }
      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      generator2(collector.generatorOutputFor(model2))

      const content = collector.getGeneratedContent()
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
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
        generatorOutput.createFile('path/to/file1', 'Model content1')
      }
      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      const content = collector.getGeneratedContent()
      expect(content.size).toBe(1)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: '/dir/doc1.langium',
        overwrite: true
      })
    })

    test('Same file with different content are not ok - same dsl', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
        generatorOutput.createFile('path/to/file1', 'Model content2')
      }
      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      expect(() => {
        generator(collector.generatorOutputFor(model))
      }).toThrowError('ERROR generating /dir/doc1.langium -> path/to/file1: File with different content was already generated from /dir/doc1.langium')
    })

    test('Same file with different content are not ok - different dsl', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
      }
      function generator2(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content2')
      }
      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      expect(() => {
        generator2(collector.generatorOutputFor(model))
      }).toThrowError('ERROR generating /dir/doc1.langium -> path/to/file1: File with different content was already generated from /dir/doc1.langium')
    })

    test('Same file with different overwrite are not ok', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1', true)
      }
      function generator2(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1', false)
      }
      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      expect(() => {
        generator2(collector.generatorOutputFor(model))
      }).toThrowError('ERROR generating /dir/doc1.langium -> path/to/file1: File with different overwrite flag was already generated from /dir/doc1.langium')
    })
  })

  describe('Creating files', () => {
    let tmpDir: string

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'langium-tools-generator-test-'))
    })

    afterEach(() => {
      if (fs.existsSync(tmpDir)) {
        // Ensure we removing only .dsl and .js files and the directory itself
        fs.readdirSync(tmpDir, { withFileTypes: true }).forEach((file) => {
          const ext = path.extname(file.name)
          if (ext !== '.dsl' && ext !== '.js' && !file.isDirectory()) {
            throw new Error(`Unexpected file found in tmp directory: ${file}`)
          }
        })
        fs.rmSync(tmpDir, { recursive: true })
      }
    })

    test('No files to create - dir get created', () => {
      const collector = new GeneratorOutputCollector()
      collector.writeToDisk(tmpDir)
      expect(fs.readdirSync(tmpDir)).toStrictEqual([])
    })

    test('No files to create - dir get created recursively', () => {
      const collector = new GeneratorOutputCollector()
      const workspacePath = path.join(tmpDir, 'path', 'to')
      collector.writeToDisk(workspacePath)
      expect(fs.readdirSync(workspacePath)).toStrictEqual([])
    })

    test('Create 1 file', () => {
      const collector = new GeneratorOutputCollector()
      const generatorOutput = collector.generatorOutputFor(model)
      generatorOutput.createFile('file1.js', '// Model content1')
      collector.writeToDisk(tmpDir)
      expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
    })

    test('Create 1 file in a subdirectory', () => {
      const collector = new GeneratorOutputCollector()
      const generatorOutput = collector.generatorOutputFor(model)
      generatorOutput.createFile('path/to/file1.js', '// Model content1')
      collector.writeToDisk(tmpDir)
      expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file1.js'), 'utf8')).toBe('// Model content1')
    })

    test('Create 1 file without overwrite', () => {
      const filePath1 = path.join(tmpDir, 'file1.js')
      fs.writeFileSync(filePath1, '// Existing content 1')
      const filePath2 = path.join(tmpDir, 'file2.js')
      fs.writeFileSync(filePath2, '// Existing content 2')

      const collector = new GeneratorOutputCollector()
      const generatorOutput = collector.generatorOutputFor(model)
      generatorOutput.createFile('file1.js', '// New content1', false)
      generatorOutput.createFile('file2.js', '// New content2', true)
      collector.writeToDisk(tmpDir)
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

      const collector = new GeneratorOutputCollector()
      const generatorOutput = collector.generatorOutputFor(model)
      generatorOutput.createFile('file1.js', '// Existing content 1', true)
      generatorOutput.createFile('file2.js', '// New content2', true)
      collector.writeToDisk(tmpDir)
      expect(fs.readFileSync(filePath1, 'utf8')).toBe('// Existing content 1')
      expect(fs.readFileSync(filePath2, 'utf8')).toBe('// New content2')
      expect(fs.statSync(filePath1).mtimeMs).toBe(lastModified1)
      expect(fs.statSync(filePath2).mtimeMs).toBeGreaterThan(lastModified2)
    })

    test('Create multiple files and directories', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('file1.js', '// Model content1')
        generatorOutput.createFile('path/to/file2.js', '// Model content2')
        generatorOutput.createFile('path/to/file3.js', '// Model content3', true)
        generatorOutput.createFile('path/to/file4.js', '// Model content4', false)
      }
      const workspaceURI = URI.parse('file:///workspace')
      const collector = new GeneratorOutputCollector([workspaceURI])
      generator(collector.generatorOutputFor(model))
      collector.writeToDisk(tmpDir)
      expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
      expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file2.js'), 'utf8')).toBe('// Model content2')
      expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file3.js'), 'utf8')).toBe('// Model content3')
      expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file4.js'), 'utf8')).toBe('// Model content4')
      expect(fs.readdirSync(tmpDir, { recursive: true }).length).toBe(4 + 2)
    })
  })
})

