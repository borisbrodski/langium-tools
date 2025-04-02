import path from 'path';
import * as fs from 'fs'
import { expect, test, describe, beforeAll, beforeEach } from 'vitest';
import { Grammar } from 'langium';
import { GeneratorMode, GeneratorTestOptions, langiumGeneratorTest } from '../../src/testing/generator-testing.js';
import { createLangiumGrammarServices, LangiumGrammarServices } from 'langium/grammar';
import { DefaultSharedModuleContext, LangiumSharedServices } from 'langium/lsp';

import { kebabCase } from 'change-case';
import { GeneratorManager } from '../../src/generator/generated-content-manager.js';

describe('Generator Testing Framework', () => {
  let testSuiteDir: string;
  let testDir: string;
  let workspaceDir: string;
  let generatedDir: string;
  let options: GeneratorTestOptions<{ grammar: LangiumGrammarServices }, LangiumSharedServices, Grammar>;

  beforeAll(() => {
    testSuiteDir = path.join(__dirname, 'generator-testing');

    options = {
      createServices: (context: DefaultSharedModuleContext) => {
        return createLangiumGrammarServices(context);
      },
    };
  });

  beforeEach(() => {
    const testDirName = kebabCase(expect.getState().currentTestName?.split(" > ").pop() || '');
    testDir = path.join(testSuiteDir, testDirName);
    safeDelete(testDir);

    workspaceDir = path.join(testDir, 'dsls');
    generatedDir = path.join(testDir, 'generated');

    fs.mkdirSync(workspaceDir, { recursive: true });
  });

  test('Generate single file', async () => {
    fs.writeFileSync(path.join(workspaceDir, 'sample.langium'), 'grammar simple entry Model: name="model";');

    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile('out/output.txt', 'My content');
      },
      generateMode: GeneratorMode.Generate
    });

    const generatedFiles = fs.readdirSync(generatedDir, { recursive: true });
    expect(generatedFiles).toContain('out')
    expect(generatedFiles).toContain(`out${path.sep}output.txt`)
    const content = fs.readFileSync(path.join(path.join(generatedDir, 'out'), 'output.txt'), 'utf-8');
    expect(content).toBe('My content');
  });

  test('Generate files and verify content', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // First, run the generator in 'Generate' mode to produce the expected files
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile('output.txt', 'My content 1');
        generator.createFile('out/output.txt', 'My content 2');
        generator.createFile('out/output2.txt', 'My content 3');
      },
      generateMode: GeneratorMode.Generate,
    });

    // Now, run the generator in 'Verify' mode to ensure the generated content matches
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile('output.txt', 'My content 1');
        generator.createFile('out/output.txt', 'My content 2');
        generator.createFile('out/output2.txt', 'My content 3');
      },
      generateMode: GeneratorMode.Verify,
    });

    // If no error is thrown, the test passes
  });

  test('Detect changes in generated content', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // First, run the generator in 'Generate' mode to produce the initial files
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile('output.txt', 'Original content');
        generator.createFile('out/output.txt', 'Original content');
      },
      generateMode: GeneratorMode.Generate,
    });

    // Now, modify the generator to produce different content
    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile('output.txt', 'Original content');
          generator.createFile('out/output.txt', 'Modified content');
        },
        generateMode: GeneratorMode.Verify,
      })
    ).rejects.toThrow(/File: out\/output.txt: expected 'Modified content' to be 'Original content'/);
  });

  test('Detect missing generated files', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // Generate two files in 'Generate' mode
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile('out/file1.txt', 'Content of file 1');
        generator.createFile('out/file2.txt', 'Content of file 2');
      },
      generateMode: GeneratorMode.Generate,
    });

    // In 'Verify' mode, only generate one file
    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile('out/file1.txt', 'Content of file 1');
          // 'file2.txt' is intentionally omitted
        },
        generateMode: GeneratorMode.Verify,
      })
    ).rejects.toThrow('Missing generated file(s)');
  });

  test('Detect unexpected generated files', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile('out/file1.txt', 'Content of file 1');
      },
      generateMode: GeneratorMode.Generate,
    });

    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile('out/file1.txt', 'Content of file 1');
          generator.createFile('out/file2.txt', 'Content of file 2');
        },
        generateMode: GeneratorMode.Verify,
      })
    ).rejects.toThrow(`Unexpected generated file: out${path.sep}file2.txt`);
  });

  test('Detect changes in overwrite flag true->false', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // First, run the generator in 'Generate' mode with overwrite: false
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile(`output.txt`, 'Initial content', { overwrite: true });
        generator.createFile(`out/output.txt`, 'Initial content', { overwrite: true });
      },
      generateMode: GeneratorMode.Generate,
    });

    // Now, run the generator in 'Verify' mode, changing the overwrite flag to true
    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile(`output.txt`, 'Initial content', { overwrite: true });
          generator.createFile(`out/output.txt`, 'Initial content', { overwrite: false });
        },
        generateMode: GeneratorMode.Verify,
      })
    ).rejects.toThrow(/File: out\/output.txt. Overwrite flag was changed: expected false to be true/);
  });

  test('Detect changes in overwrite flag false->true', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // First, run the generator in 'Generate' mode with overwrite: false
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile(`output.txt`, 'Initial content', { overwrite: false });
        generator.createFile(`out/output.txt`, 'Initial content', { overwrite: false });
      },
      generateMode: GeneratorMode.Generate,
    });

    // Now, run the generator in 'Verify' mode, changing the overwrite flag to true
    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile(`output.txt`, 'Initial content', { overwrite: false });
          generator.createFile(`out/output.txt`, 'Initial content', { overwrite: true });
        },
        generateMode: GeneratorMode.Verify,
      })
    ).rejects.toThrow(/File: out\/output.txt. Overwrite flag was changed: expected true to be false/);
  });

  test('Custom target - Detect changes in generated content', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // First, run the generator in 'Generate' mode, using the default target
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile(`out/output.txt`, 'Content 1 in default target');
        generator.createFile(`out/output.txt`, 'Content 2 in default target', { target: 'custom' });
      },
      generateMode: GeneratorMode.Generate,
    }, [{ name: 'custom', overwrite: true, clean: false }]);

    // Now, run the generator in 'Verify' mode, changing the target to 'custom'
    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile(`out/output.txt`, 'Content 1 in default target');
          generator.createFile(`out/output.txt`, 'Changed content 2 in default target', { target: 'custom' });
        },
        generateMode: GeneratorMode.Verify,
      }, [{ name: 'custom', overwrite: true, clean: false }])
    ).rejects.toThrow("File for target 'custom': out/output.txt: expected 'Changed content 2 in default target' to be 'Content 2 in default target'");
  });

  test('Custom target - Detect missing generated files', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // First, run the generator in 'Generate' mode, using the default target
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile(`out/output.txt`, 'Content 1 in default target');
        generator.createFile(`out/output.txt`, 'Content 2 in default target', { target: 'custom' });
      },
      generateMode: GeneratorMode.Generate,
    }, [{ name: 'custom', overwrite: true, clean: false }]);

    // Now, run the generator in 'Verify' mode, changing the target to 'custom'
    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile(`out/output.txt`, 'Content 1 in default target');
        },
        generateMode: GeneratorMode.Verify,
      }, [{ name: 'custom', overwrite: true, clean: false }])
    ).rejects.toThrow(`Missing generated file(s) for target 'custom': out${path.sep}output.txt`);
  });

  test('Custom target - Detect unexpected files', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    // First, run the generator in 'Generate' mode, using the default target
    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile(`out/output.txt`, 'Content 1 in default target');
        generator.createFile(`out/output.txt`, 'Content 2 in default target', { target: 'custom' });
      },
      generateMode: GeneratorMode.Generate,
    }, [{ name: 'custom', overwrite: true, clean: false }]);

    // Now, run the generator in 'Verify' mode, changing the target to 'custom'
    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile(`out/output.txt`, 'Content 1 in default target');
          generator.createFile(`out/output.txt`, 'Content 2 in default target', { target: 'custom' });
          generator.createFile(`out/unexpected-output.txt`, 'Some content', { target: 'custom' });
        },
        generateMode: GeneratorMode.Verify,
      }, [{ name: 'custom', overwrite: true, clean: false }])
    ).rejects.toThrow(`Unexpected generated file for target 'custom': out${path.sep}unexpected-output.txt`);
  });

  test('Custom target - Detect changes in overwrite flag true->false', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile(`output.txt`, 'Initial content', { overwrite: true });
        generator.createFile(`output.txt`, 'Initial content', { target: 'custom', overwrite: true });
        generator.createFile(`out/output.txt`, 'Initial content', { target: 'custom', overwrite: true });
      },
      generateMode: GeneratorMode.Generate,
    }, [{ name: 'custom', overwrite: true, clean: false }]);

    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile(`output.txt`, 'Initial content', { overwrite: true });
          generator.createFile(`output.txt`, 'Initial content', { target: 'custom', overwrite: true });
          generator.createFile(`out/output.txt`, 'Initial content', { target: 'custom', overwrite: false });
        },
        generateMode: GeneratorMode.Verify,
      }, [{ name: 'custom', overwrite: true, clean: false }])
    ).rejects.toThrow("File for target 'custom': out/output.txt. Overwrite flag was changed: expected false to be true");
  });

  test('Custom target - Detect changes in overwrite flag false->true', async () => {
    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: async (_, __, generator) => {
        generator.createFile(`output.txt`, 'Initial content', { overwrite: true });
        generator.createFile(`output.txt`, 'Initial content', { target: 'custom', overwrite: true });
        generator.createFile(`out/output.txt`, 'Initial content', { target: 'custom', overwrite: false });
      },
      generateMode: GeneratorMode.Generate,
    }, [{ name: 'custom', overwrite: true, clean: false }]);

    await expect(
      langiumGeneratorTest(testDir, {
        ...options,
        generateForModel: async (_, __, generator) => {
          generator.createFile(`output.txt`, 'Initial content', { overwrite: true });
          generator.createFile(`output.txt`, 'Initial content', { target: 'custom', overwrite: true });
          generator.createFile(`out/output.txt`, 'Initial content', { target: 'custom', overwrite: true });
        },
        generateMode: GeneratorMode.Verify,
      }, [{ name: 'custom', overwrite: true, clean: false }])
    ).rejects.toThrow("File for target 'custom': out/output.txt. Overwrite flag was changed: expected true to be false");
  });

  test('Regeneration has no memory effect', async () => {
    async function generatorOld<T1, T2>(_: T1, __: T2, generator: GeneratorManager) {
      generator.createFile(`unchanged.txt`, 'Initial content');
      generator.createFile(`content-changed.txt`, 'Initial content');
      generator.createFile(`missing.txt`, 'Initial content');
      generator.createFile(`out/overwrite-true.txt`, 'Initial content', { overwrite: true });
      generator.createFile(`out/overwrite-false.txt`, 'Initial content', { overwrite: false });
      generator.createFile(`custom-unchanged.txt`, 'Initial content', { target: 'custom' });
      generator.createFile(`custom-content-changed.txt`, 'Initial content', { target: 'custom' });
      generator.createFile(`custom-missing.txt`, 'Initial content', { target: 'custom' });
      generator.createFile(`out/custom-overwrite-true.txt`, 'Initial content', { target: 'custom', overwrite: true });
      generator.createFile(`out/overwrite-false.txt`, 'Initial content', { target: 'custom', overwrite: false });
    }
    async function generatorNew<T1, T2>(_: T1, __: T2, generator: GeneratorManager) {
      generator.createFile(`unchanged.txt`, 'Initial content');
      generator.createFile(`content-changed.txt`, 'Content changed');
      // generator.createFile(`missing.txt`, 'Initial content');
      generator.createFile(`new-file.txt`, 'New content');
      generator.createFile(`out/overwrite-true.txt`, 'Initial content', { overwrite: false });
      generator.createFile(`out/overwrite-false.txt`, 'Initial content', { overwrite: true });
      generator.createFile(`custom-unchanged.txt`, 'Initial content', { target: 'custom' });
      generator.createFile(`custom-content-changed.txt`, 'Content changed', { target: 'custom' });
      // generator.createFile(`custom-missing.txt`, 'Initial content', { target: 'custom' });
      generator.createFile(`custom-new-file.txt`, 'New content', { target: 'custom' });
      generator.createFile(`custom-out/overwrite-true.txt`, 'Initial content', { target: 'custom', overwrite: false });
      generator.createFile(`custom-out/overwrite-false.txt`, 'Initial content', { target: 'custom', overwrite: true });
    }

    fs.writeFileSync(
      path.join(workspaceDir, 'sample.langium'),
      'grammar simple entry Model: name="model";'
    );

    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: generatorOld,
      generateMode: GeneratorMode.Generate,
    }, [{ name: 'custom', overwrite: true, clean: false }]);

    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: generatorNew,
      generateMode: GeneratorMode.Generate,
    }, [{ name: 'custom', overwrite: true, clean: false }]);

    await langiumGeneratorTest(testDir, {
      ...options,
      generateForModel: generatorNew,
      generateMode: GeneratorMode.Verify,
    }, [{ name: 'custom', overwrite: true, clean: false }])
  });

});

function safeDelete(dir: string, extensions: string[] = ['.json', '.txt', '.langium']) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((file) => {
      const ext = path.extname(file.name)
      if (!extensions.includes(ext) && !file.isDirectory()) {
        throw new Error(`Unexpected file found in tmp directory: ${file.name}. Allowed extensions: ${extensions}`)
      }
    })
    fs.rmSync(dir, { recursive: true })
  }
}
