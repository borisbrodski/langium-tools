import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { GeneratorOutput, GeneratorOutputCollector } from '../../src/generator/generator-output-collector'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

type Model = {
  name: string,
  files: {
    name: string,
    content: string,
    overwrite?: boolean | undefined,
  }[]
}

function modelGenerator(model: Model, generatorOutput: GeneratorOutput): void {
  for (const file of model.files) {
    if (file.overwrite === undefined) {
      generatorOutput.createFile(file.name, file.content, true)
    } else {
      generatorOutput.createFile(file.name, file.content, file.overwrite)
    }
  }
}

describe('GeneratorOutputCollector', () => {
  describe('Collecting content', () => {
    test('Get DSL workspace path in generator', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        expect(generatorOutput.getDslWorkspacePath()).toBe('test.dsl')
      }

      const collector = new GeneratorOutputCollector()
      generator(collector.generatorOutputFor('test.dsl'))
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

      const collector = new GeneratorOutputCollector()
      generator(collector.generatorOutputFor('test.dsl'))
      expect(collector.getGeneratedContent().size).toBe(1)
      expect(collector.getGeneratedContent().get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        dslWorkspacePath: 'test.dsl',
        overwrite: false
      })
    })

    test('Generate 2 files', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1')
        generatorOutput.createFile('path/to/file2', 'Model content2')
      }

      const collector = new GeneratorOutputCollector()
      generator(collector.generatorOutputFor('test.dsl'))
      const content = collector.getGeneratedContent()
      expect(content.size).toBe(2)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        dslWorkspacePath: 'test.dsl',
        overwrite: false
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        dslWorkspacePath: 'test.dsl',
        overwrite: false
      })
    })

    test('Generate 2 files with overwrite', () => {
      function generator(generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile('path/to/file1', 'Model content1', false)
        generatorOutput.createFile('path/to/file2', 'Model content2', true)
      }

      const collector = new GeneratorOutputCollector()
      generator(collector.generatorOutputFor('test.dsl'))
      const content = collector.getGeneratedContent()
      expect(content.size).toBe(2)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        dslWorkspacePath: 'test.dsl',
        overwrite: false
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        dslWorkspacePath: 'test.dsl',
        overwrite: true
      })
    })

    test('Generate 2 files from 2 dsls', () => {
      function generator(name: string, generatorOutput: GeneratorOutput): void {
        generatorOutput.createFile(`path/to/${name}`, `Model ${name}`)
      }

      const collector = new GeneratorOutputCollector()
      generator("dsl1", collector.generatorOutputFor('test1.dsl'))
      generator("dsl2", collector.generatorOutputFor('test2.dsl'))

      const content = collector.getGeneratedContent()
      expect(content.size).toBe(2)
      expect(content.get('path/to/dsl1')).toStrictEqual({
        content: 'Model dsl1',
        dslWorkspacePath: 'test1.dsl',
        overwrite: false
      })
      expect(content.get('path/to/dsl2')).toStrictEqual({
        content: 'Model dsl2',
        dslWorkspacePath: 'test2.dsl',
        overwrite: false
      })
    })


    test('Generate multiple files', () => {
      const collector = new GeneratorOutputCollector()
      modelGenerator({
        name: 'my-model',
        files: [{
          name: 'path/to/file1',
          content: 'Model content1'
        },
        {
          name: 'path/to/file2',
          content: 'Model content2'
        },
        {
          name: 'path/to/file3',
          content: 'Model content3',
          overwrite: true
        },
        {
          name: 'path/to/file4',
          content: 'Model content4',
          overwrite: false
        }]
      }, collector.generatorOutputFor('test.dsl'))
      const content = collector.getGeneratedContent()
      expect(content.size).toBe(4)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        dslWorkspacePath: 'test.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        dslWorkspacePath: 'test.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file3')).toStrictEqual({
        content: 'Model content3',
        dslWorkspacePath: 'test.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file4')).toStrictEqual({
        content: 'Model content4',
        dslWorkspacePath: 'test.dsl',
        overwrite: false
      })
    })
    test('Generate multiple files from multiple dsls', () => {
      const collector = new GeneratorOutputCollector()
      modelGenerator({
        name: 'my-model',
        files: [{
          name: 'path/to/file1',
          content: 'Model content1'
        },
        {
          name: 'path/to/file2',
          content: 'Model content2'
        },
        {
          name: 'path/to/file3',
          content: 'Model content3',
          overwrite: true
        },
        {
          name: 'path/to/file4',
          content: 'Model content4',
          overwrite: false
        }]
      }, collector.generatorOutputFor('test1.dsl'))
      modelGenerator({
        name: 'my-model',
        files: [{
          name: 'path/to/file5',
          content: 'Model content5'
        },
        {
          name: 'path/to/file6',
          content: 'Model content6'
        },
        {
          name: 'path/to/file7',
          content: 'Model content7',
          overwrite: true
        },
        {
          name: 'path/to/file8',
          content: 'Model content8',
          overwrite: false
        }]
      }, collector.generatorOutputFor('test2.dsl'))
      const content = collector.getGeneratedContent()
      expect(content.size).toBe(8)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        dslWorkspacePath: 'test1.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file2')).toStrictEqual({
        content: 'Model content2',
        dslWorkspacePath: 'test1.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file3')).toStrictEqual({
        content: 'Model content3',
        dslWorkspacePath: 'test1.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file4')).toStrictEqual({
        content: 'Model content4',
        dslWorkspacePath: 'test1.dsl',
        overwrite: false
      })
      expect(content.get('path/to/file5')).toStrictEqual({
        content: 'Model content5',
        dslWorkspacePath: 'test2.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file6')).toStrictEqual({
        content: 'Model content6',
        dslWorkspacePath: 'test2.dsl',
        overwrite: true
      })
      expect(content.get('path/to/file7')).toStrictEqual({
        content: 'Model content7',
        dslWorkspacePath: 'test2.dsl',
        overwrite: true
      })
    })
    test('Same file with same content are ok', () => {
      const collector = new GeneratorOutputCollector()
      modelGenerator({
        name: 'my-model',
        files: [{
          name: 'path/to/file1',
          content: 'Model content1'
        },
        {
          name: 'path/to/file1',
          content: 'Model content1'
        }]
      }, collector.generatorOutputFor('test.dsl'))
      const content = collector.getGeneratedContent()
      expect(content.size).toBe(1)
      expect(content.get('path/to/file1')).toStrictEqual({
        content: 'Model content1',
        dslWorkspacePath: 'test.dsl',
        overwrite: true
      })
    })
    test('Same file with different content are not ok - same dsl', () => {
      const collector = new GeneratorOutputCollector()
      expect(() => {
        modelGenerator({
          name: 'my-model',
          files: [{
            name: 'path/to/file1',
            content: 'Model content1'
          },
          {
            name: 'path/to/file1',
            content: 'Model content2'
          }]
        }, collector.generatorOutputFor('test.dsl'))
      }).toThrowError('ERROR generating test.dsl -> path/to/file1: File with different content was already generated from test.dsl')
    })
    test('Same file with different content are not ok - different dsl', () => {
      const collector = new GeneratorOutputCollector()
      modelGenerator({
        name: 'my-model',
        files: [{
          name: 'path/to/file1',
          content: 'Model content1'
        }]
      }, collector.generatorOutputFor('test1.dsl'))
      expect(() => {
        modelGenerator({
          name: 'my-model',
          files: [{
            name: 'path/to/file1',
            content: 'Model content2'
          }]
        }, collector.generatorOutputFor('test2.dsl'))
      }).toThrowError('ERROR generating test2.dsl -> path/to/file1: File with different content was already generated from test1.dsl')
    })
    test('Same file with different overwrite are not ok', () => {
      const collector = new GeneratorOutputCollector()
      modelGenerator({
        name: 'my-model',
        files: [{
          name: 'path/to/file1',
          content: 'Model content1',
          overwrite: true
        }]
      }, collector.generatorOutputFor('test1.dsl'))
      expect(() => {
        modelGenerator({
          name: 'my-model',
          files: [{
            name: 'path/to/file1',
            content: 'Model content1',
            overwrite: false
          }]
        }, collector.generatorOutputFor('test2.dsl'))
      }).toThrowError('ERROR generating test2.dsl -> path/to/file1: File with different overwrite flag was already generated from test1.dsl')
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
      const generatorOutput = collector.generatorOutputFor('test.dsl')
      generatorOutput.createFile('file1.js', '// Model content1')
      collector.writeToDisk(tmpDir)
      expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
    })

    test('Create 1 file in a subdirectory', () => {
      const collector = new GeneratorOutputCollector()
      const generatorOutput = collector.generatorOutputFor('test.dsl')
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
      const generatorOutput = collector.generatorOutputFor('test.dsl')
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
      const generatorOutput = collector.generatorOutputFor('test.dsl')
      generatorOutput.createFile('file1.js', '// Existing content 1', true)
      generatorOutput.createFile('file2.js', '// New content2', true)
      collector.writeToDisk(tmpDir)
      expect(fs.readFileSync(filePath1, 'utf8')).toBe('// Existing content 1')
      expect(fs.readFileSync(filePath2, 'utf8')).toBe('// New content2')
      expect(fs.statSync(filePath1).mtimeMs).toBe(lastModified1)
      expect(fs.statSync(filePath2).mtimeMs).toBeGreaterThan(lastModified2)
    })

    test('Create multiple files and directories', () => {
      const collector = new GeneratorOutputCollector()
      modelGenerator({
        name: 'my-model',
        files: [{
          name: 'file1.js',
          content: '// Model content1'
        },
        {
          name: 'path/to/file2.js',
          content: '// Model content2'
        },
        {
          name: 'path/to/file3.js',
          content: '// Model content3',
          overwrite: true
        },
        {
          name: 'path/to/file4.js',
          content: '// Model content4',
          overwrite: false
        }]
      }, collector.generatorOutputFor('test.dsl'))
      collector.writeToDisk(tmpDir)
      expect(fs.readFileSync(path.join(tmpDir, 'file1.js'), 'utf8')).toBe('// Model content1')
      expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file2.js'), 'utf8')).toBe('// Model content2')
      expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file3.js'), 'utf8')).toBe('// Model content3')
      expect(fs.readFileSync(path.join(tmpDir, 'path', 'to', 'file4.js'), 'utf8')).toBe('// Model content4')
      expect(fs.readdirSync(tmpDir, { recursive: true }).length).toBe(4 + 2)
    })
  })
})

