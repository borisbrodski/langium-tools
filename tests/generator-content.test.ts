import { describe, expect, test } from 'vitest'
import { GeneratorOutput, GeneratorOutputCollector } from '../src/langium-tools-generator'

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

describe('GeneratorOutput', () => {
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
