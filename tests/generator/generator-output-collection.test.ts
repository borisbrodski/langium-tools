import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { GeneratorManager, GeneratedContentManager } from '../../src/generator/generated-content-manager'
import { using } from '../../src/testing'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { EmptyFileSystem, Grammar, LangiumDocument, URI } from 'langium'
import { createLangiumGrammarServices } from 'langium/grammar'
import { parseHelper } from 'langium/test'
import { listAllFiles, removeTmpDirectory } from '../common'

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
    test('Generating without workspace', async () => {
      const model = document.parseResult.value
      const manager = new GeneratedContentManager()
      using(manager.generatorManagerFor(model), output => {
        expect(output.getModel()).toBe(model)
        expect(output.getDocument()).toBe(document)
        expect(output.getWorkspaceURI()).toBeUndefined()
        expect(output.getDocumentLocalPath()).toBe("doc1.langium")
      })
    })

    test('Generating with document outside of workspace', async () => {
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
        expect(output.getDocumentLocalPath()).toBe('doc1.langium')
      })
      generator(manager.generatorManagerFor(model))
      expect(manager.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: document.uri.toString(),
        overwrite: true
      })
    })

    test('Generating with document in workspace', async () => {
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
        expect(output.getDocumentLocalPath()).toBe('dir/doc1.langium')
      })
      generator(manager.generatorManagerFor(model))
      expect(manager.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate no files', async () => {
      const manager = new GeneratedContentManager()
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(0)
    })

    test('Generate 1 file', async () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
      }

      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      expect(manager.getGeneratedContent().size).toBe(1)
      expect(manager.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate 2 files', async () => {
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
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate 2 files with overwrite', async () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1', { overwrite: false })
        generatorManager.createFile('path/to/file2', 'Model content2', { overwrite: true })
      }

      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(2)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: 'dir/doc1.langium',
        overwrite: false
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
    })

    test('Generate 2 files from 2 dsls', async () => {
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
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/dsl2')).toStrictEqual({
        content: 'Model dsl2',
        documentPath: 'dir/doc2.langium',
        overwrite: true
      })
    })

    test('Generate multiple files', async () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file2', 'Model content2')
        generatorManager.createFile('path/to/file3', 'Model content3', { overwrite: true })
        generatorManager.createFile('path/to/file4', 'Model content4', { overwrite: false })
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      const content = manager.getGeneratedContent()
      expect(content.size).toBe(4)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file3')).toStrictEqual({
        content: 'Model content3',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file4')).toStrictEqual({
        content: 'Model content4',
        documentPath: 'dir/doc1.langium',
        overwrite: false
      })
    })

    test('Generate multiple files from multiple dsls', async () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file2', 'Model content2')
        generatorManager.createFile('path/to/file3', 'Model content3', { overwrite: true })
        generatorManager.createFile('path/to/file4', 'Model content4', { overwrite: false })
      }
      function generator2(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file5', 'Model content5')
        generatorManager.createFile('path/to/file6', 'Model content6')
        generatorManager.createFile('path/to/file7', 'Model content7', { overwrite: true })
        generatorManager.createFile('path/to/file8', 'Model content8', { overwrite: false })
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      generator2(manager.generatorManagerFor(model2))

      const content = manager.getGeneratedContent()
      expect(content.size).toBe(8)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file3')).toStrictEqual({
        content: 'Model content3',
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
      expect(content.get('path/to/file4')).toStrictEqual({
        content: 'Model content4',
        documentPath: 'dir/doc1.langium',
        overwrite: false
      })
      expect(content.get('path/to/file5')).toStrictEqual({
        content: 'Model content5',
        documentPath: 'dir/doc2.langium',
        overwrite: true
      })
      expect(content.get('path/to/file6')).toStrictEqual({
        content: 'Model content6',
        documentPath: 'dir/doc2.langium',
        overwrite: true
      })
      expect(content.get('path/to/file7')).toStrictEqual({
        content: 'Model content7',
        documentPath: 'dir/doc2.langium',
        overwrite: true
      })
    })

    test('Same file with same content are ok', async () => {
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
        documentPath: 'dir/doc1.langium',
        overwrite: true
      })
    })

    test('Same file with different content are not ok - same dsl', async () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1')
        generatorManager.createFile('path/to/file1', 'Model content2')
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      expect(() => {
        generator(manager.generatorManagerFor(model))
      }).toThrowError('Conflict generating file "path/to/file1" from "dir/doc1.langium": A file with different content was already generated from "dir/doc1.langium".')
    })

    test('Same file with different content are not ok - different dsl', async () => {
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
      }).toThrowError('Conflict generating file "path/to/file1" from "dir/doc1.langium": A file with different content was already generated from "dir/doc1.langium".')
    })

    test('Same file with different overwrite are not ok', async () => {
      function generator(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1', { overwrite: true })
      }
      function generator2(generatorManager: GeneratorManager): void {
        generatorManager.createFile('path/to/file1', 'Model content1', { overwrite: false })
      }
      const workspaceURI = URI.parse('file:///workspace')
      const manager = new GeneratedContentManager([workspaceURI])
      generator(manager.generatorManagerFor(model))
      expect(() => {
        generator2(manager.generatorManagerFor(model))
      }).toThrowError('Conflict generating file "path/to/file1" from "dir/doc1.langium": A file with different overwrite flag was already generated from "dir/doc1.langium".')
    })
  })

  describe('Creating files', () => {
    let tmpDir: string
    let tmpDir2: string
    let tmpDir3: string

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'langium-tools-generator-test-tmp1-'))
      tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'langium-tools-generator-test-tmp2-'))
      tmpDir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'langium-tools-generator-test-tmp3-'))
    })

    afterEach(() => {
      [tmpDir, tmpDir2, tmpDir3].forEach(dir => {
        removeTmpDirectory(dir)
      })
    })

    describe('Single output directory', () => {
      test('No files to create - dir get created', async () => {
        const manager = new GeneratedContentManager()
        await manager.writeToDisk(tmpDir)
        expect(fs.readdirSync(tmpDir)).toStrictEqual([])
      })

      test('No files to create - dir get created recursively', async () => {
        const manager = new GeneratedContentManager()
        const workspacePath = path.join(tmpDir, 'path', 'to')
        await manager.writeToDisk(workspacePath)
        expect(fs.readdirSync(workspacePath)).toStrictEqual([])
      })

      test('Create 1 file', async () => {
        const manager = new GeneratedContentManager()
        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// Model content1')
        await manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
      })

      test('Create 1 file in a subdirectory', async () => {
        const manager = new GeneratedContentManager()
        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('path/to/file1.js', '// Model content1')
        await manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file1.js'), 'utf8')).toBe('// Model content1')
      })

      test('Create 1 file without overwrite', async () => {
        const filePath1 = path.join(tmpDir, 'file1.js')
        fs.writeFileSync(filePath1, '// Existing content 1')
        const filePath2 = path.join(tmpDir, 'file2.js')
        fs.writeFileSync(filePath2, '// Existing content 2')

        const manager = new GeneratedContentManager()
        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// New content1', { overwrite: false })
        generatorManager.createFile('file2.js', '// New content2', { overwrite: true })
        await manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(filePath1, 'utf8')).toBe('// Existing content 1')
        expect(fs.readFileSync(filePath2, 'utf8')).toBe('// New content2')
      })

      test('Non-participating file get deleted', async () => {
        const TARGET = "target"
        const filePath1 = path.join(tmpDir, 'file1.js')
        fs.writeFileSync(filePath1, '// Existing content 1')
        fs.writeFileSync(path.join(tmpDir, 'file2.js'), '// Existing content 2')

        const manager = new GeneratedContentManager()
        manager.addTarget({ name: TARGET, overwrite: true, clean: true})

        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// New content 1', { target: TARGET })

        await manager.writeToDisk(tmpDir, TARGET)
        
        expect(fs.readFileSync(filePath1, 'utf8')).toBe('// New content 1')
        expect(fs.readdirSync(tmpDir).length).toBe(1)
      })

      test('Non-participating files get deleted', async () => {
        const TARGET = "target"
        const filePath1 = path.join(tmpDir, 'file1.js')
        fs.writeFileSync(filePath1, '// Existing content 1')
        fs.writeFileSync(path.join(tmpDir, 'file2.js'), '// Existing content 2')
        fs.writeFileSync(path.join(tmpDir, 'file3.js'), '// Existing content 2')
        fs.writeFileSync(path.join(tmpDir, 'file4.js'), '// Existing content 2')

        const manager = new GeneratedContentManager()
        manager.addTarget({ name: TARGET, overwrite: true, clean: true})

        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// New content 1', { target: TARGET })

        await manager.writeToDisk(tmpDir, TARGET)
        
        expect(fs.readFileSync(filePath1, 'utf8')).toBe('// New content 1')
        expect(fs.readdirSync(tmpDir).length).toBe(1)
      })

      test('Non-participating files in dirs get deleted', async () => {
        const TARGET = "target"
        const filePath1 = path.join(tmpDir, 'file1.js')
        const tmpDirSubDir1 = path.join(tmpDir, 'dir1') 
        fs.mkdirSync(tmpDirSubDir1)
        const tmpDirSubDir2 = path.join(tmpDir, 'dir2') 
        fs.mkdirSync(tmpDirSubDir2)
        fs.writeFileSync(filePath1, '// Existing content 1')
        fs.writeFileSync(path.join(tmpDir, 'file2.js'), '// Existing content 2')
        fs.writeFileSync(path.join(tmpDirSubDir1, 'file3.js'), '// Existing content 2')
        fs.writeFileSync(path.join(tmpDirSubDir1, 'file4.js'), '// Existing content 2')
        fs.writeFileSync(path.join(tmpDirSubDir2, 'file5.js'), '// Existing content 2')

        const manager = new GeneratedContentManager()
        manager.addTarget({ name: TARGET, overwrite: true, clean: true})

        const generatorManager = manager.generatorManagerFor(model)
        generatorManager.createFile('file1.js', '// New content 1', { target: TARGET })

        await manager.writeToDisk(tmpDir, TARGET)
        
        expect(fs.readFileSync(filePath1, 'utf8')).toBe('// New content 1')
        expect(listAllFiles(tmpDir).length).toBe(1)
      })

      test('Overwriting with same content preserves last modified time', async () => {
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
        generatorManager.createFile('file1.js', '// Existing content 1', { overwrite: true })
        generatorManager.createFile('file2.js', '// New content2', { overwrite: true })
        await manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(filePath1, 'utf8')).toBe('// Existing content 1')
        expect(fs.readFileSync(filePath2, 'utf8')).toBe('// New content2')
        expect(fs.statSync(filePath1).mtimeMs).toBe(lastModified1)
        expect(fs.statSync(filePath2).mtimeMs).toBeGreaterThan(lastModified2)
      })

      test('Create multiple files and directories', async () => {
        function generator(generatorManager: GeneratorManager): void {
          generatorManager.createFile('file1.js', '// Model content1')
          generatorManager.createFile('path/to/file2.js', '// Model content2')
          generatorManager.createFile('path/to/file3.js', '// Model content3', { overwrite: true })
          generatorManager.createFile('path/to/file4.js', '// Model content4', { overwrite: false })
        }
        const workspaceURI = URI.parse('file:///workspace')
        const manager = new GeneratedContentManager([workspaceURI])
        generator(manager.generatorManagerFor(model))
        await manager.writeToDisk(tmpDir)
        expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file2.js'), 'utf8')).toBe('// Model content2')
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file3.js'), 'utf8')).toBe('// Model content3')
        expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file4.js'), 'utf8')).toBe('// Model content4')
        expect(fs.readdirSync(tmpDir, { recursive: true }).length).toBe(4 + 2)
      })
    })

    describe("Multiple output directories", () => {
      test('Files are written to the correct output directories based on target', async () => {
        const TARGET_SRC = 'SRC';

        const manager = new GeneratedContentManager();
        manager.addTarget({ name: TARGET_SRC, overwrite: false, clean: false });

        const generatorManager = manager.generatorManagerFor(model);
        generatorManager.createFile('file1.js', '// Model content1', { target: TARGET_SRC });
        generatorManager.createFile('file2.js', '// Model content2');

        await manager.writeToDisk(tmpDir); // Writes default target files
        await manager.writeToDisk(tmpDir2, TARGET_SRC); // Writes TARGET_SRC files

        expect(fs.existsSync(path.join(tmpDir, 'file2.js'))).toBe(true);
        expect(fs.readFileSync(path.join(tmpDir, 'file2.js'), 'utf8')).toBe('// Model content2');

        expect(fs.existsSync(path.join(tmpDir2, 'file1.js'))).toBe(true);
        expect(fs.readFileSync(path.join(tmpDir2, 'file1.js'), 'utf8')).toBe('// Model content1');

        expect(fs.existsSync(path.join(tmpDir, 'file1.js'))).toBe(false);
        expect(fs.existsSync(path.join(tmpDir2, 'file2.js'))).toBe(false);
      });
      test('Files with the same name in different targets and overwrite settings', async () => {
        const TARGET_SRC = 'SRC';
        const TARGET_LIB = 'LIB';

        // Pre-existing files in the target directories
        const sharedFileDefault = path.join(tmpDir, 'shared.js');
        fs.writeFileSync(sharedFileDefault, '// Existing content in default target');

        const sharedFileSrc = path.join(tmpDir2, 'shared.js');
        fs.writeFileSync(sharedFileSrc, '// Existing content in SRC target');

        const sharedFileLib = path.join(tmpDir3, 'shared.js');
        fs.writeFileSync(sharedFileLib, '// Existing content in LIB target');

        // Set up the manager and add targets with specific overwrite defaults
        const manager = new GeneratedContentManager();
        manager.addTarget({ name: TARGET_SRC, overwrite: false, clean: false }); // Overwrite is false by default for SRC
        manager.addTarget({ name: TARGET_LIB, overwrite: true, clean: false });  // Overwrite is true by default for LIB

        const generatorManager = manager.generatorManagerFor(model);

        // Create files in different targets
        generatorManager.createFile('shared.js', '// New content for default target'); // Default target
        generatorManager.createFile('shared.js', '// New content for SRC target', { target: TARGET_SRC });
        generatorManager.createFile('shared.js', '// New content for LIB target', { target: TARGET_LIB });

        // Create a file in the default target with overwrite explicitly set to false
        const file2Path = path.join(tmpDir, 'file2.js');
        fs.writeFileSync(file2Path, '// Existing content 2');
        generatorManager.createFile('file2.js', '// Should not overwrite existing file', { overwrite: false });

        // Write files to their respective directories
        await manager.writeToDisk(tmpDir);           // Writes default target files
        await manager.writeToDisk(tmpDir2, TARGET_SRC); // Writes SRC target files
        await manager.writeToDisk(tmpDir3, TARGET_LIB); // Writes LIB target files

        // Assertions for the default target (tmpDir)
        expect(fs.readFileSync(sharedFileDefault, 'utf8')).toBe('// New content for default target');
        expect(fs.readFileSync(file2Path, 'utf8')).toBe('// Existing content 2');

        // Assertions for the SRC target (tmpDir2)
        expect(fs.readFileSync(sharedFileSrc, 'utf8')).toBe('// Existing content in SRC target');

        // Assertions for the LIB target (tmpDir3)
        expect(fs.readFileSync(sharedFileLib, 'utf8')).toBe('// New content for LIB target');
      });
      test('Target with overwrite defaulting to true overwrites existing files', async () => {
        const TARGET_SRC = 'SRC';

        // Pre-existing file in the TARGET_SRC directory
        const existingFilePath = path.join(tmpDir2, 'file1.js');
        fs.writeFileSync(existingFilePath, '// Existing content in SRC target');

        // Set up the manager and add TARGET_SRC with overwrite defaulting to true
        const manager = new GeneratedContentManager();
        manager.addTarget({ name: TARGET_SRC, overwrite: true, clean: false }); // Overwrite is true by default for TARGET_SRC

        const generatorManager = manager.generatorManagerFor(model);

        // Create a file in TARGET_SRC
        generatorManager.createFile('file1.js', '// New content for SRC target', { target: TARGET_SRC });

        // Write files to the TARGET_SRC directory
        await manager.writeToDisk(tmpDir2, TARGET_SRC);

        // Assert that the existing file has been overwritten
        expect(fs.readFileSync(existingFilePath, 'utf8')).toBe('// New content for SRC target');
      });
      test('createFile overwrite option overrides target default overwrite setting', async () => {
        const TARGET_SRC = 'SRC';

        const existingFileSrc = path.join(tmpDir2, 'file1.js');
        fs.writeFileSync(existingFileSrc, '// Existing content in SRC target');

        const existingFileDefault = path.join(tmpDir, 'file2.js');
        fs.writeFileSync(existingFileDefault, '// Existing content in default target');

        const manager = new GeneratedContentManager();
        manager.addTarget({ name: TARGET_SRC, overwrite: false, clean: false });

        const generatorManager = manager.generatorManagerFor(model);

        // Scenario 1: Target's default overwrite is false, but createFile uses overwrite: true
        generatorManager.createFile('file1.js', '// New content for SRC target', { target: TARGET_SRC, overwrite: true });

        // Scenario 2: Default target's overwrite is true, but createFile uses overwrite: false
        generatorManager.createFile('file2.js', '// New content for default target', { overwrite: false });

        // Write files to their respective directories
        await manager.writeToDisk(tmpDir2, TARGET_SRC); // Writes SRC target files
        await manager.writeToDisk(tmpDir);              // Writes default target files

        // Assertions for TARGET_SRC (tmpDir2)
        // The existing file should be overwritten because overwrite: true was passed to createFile
        expect(fs.readFileSync(existingFileSrc, 'utf8')).toBe('// New content for SRC target');

        // Assertions for default target (tmpDir)
        // The existing file should NOT be overwritten because overwrite: false was passed to createFile
        expect(fs.readFileSync(existingFileDefault, 'utf8')).toBe('// Existing content in default target');
      });
      test('Adding the same target twice throws an error', async () => {
        const manager = new GeneratedContentManager();
        manager.addTarget({ name: "DUPLICATE", overwrite: true, clean: false });
        expect(() => {
          manager.addTarget({ name: "DUPLICATE", overwrite: false, clean: false });
        }).toThrowError('Target "DUPLICATE" has already been added');
      });
      test('Creating a file with a non-existing target throws an error', async () => {
        const manager = new GeneratedContentManager();
        const generatorManager = manager.generatorManagerFor(model);
        expect(() => {
          generatorManager.createFile('file.js', '// Content', { target: 'NON_EXISTING' });
        }).toThrowError('Target "NON_EXISTING" is not registered');
      });

      test('Writing to disk with a non-existing target throws an error', async () => {
        const manager = new GeneratedContentManager();
        await expect(
          manager.writeToDisk(tmpDir, 'NON_EXISTING')
        ).rejects.toThrowError('Target "NON_EXISTING" is not registered');
      });
    });
  })
})

