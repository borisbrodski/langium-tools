import { describe, test, expect, vi, beforeEach } from 'vitest';
import { generateJavaFile } from '../../../src/lang/java/generator-tools';
import { CompositeGeneratorNode } from 'langium/generate';
import { adjusted } from '../../../src/base/string';
import { GeneratorManager } from '../../../src/generator';

describe('generateJavaFile', () => {
  let createFileMock: ReturnType<typeof vi.fn>;
  let generatorManager: GeneratorManager;

  beforeEach(() => {
    createFileMock = vi.fn();
    generatorManager = {
      createFile: createFileMock,
      getModel: vi.fn(),
      getDocument: vi.fn(),
      getWorkspaceURI: vi.fn(),
      getDocumentLocalPath: vi.fn(),
    };
  })

  test('generates a simple Java class file with a single import', () => {
    generateJavaFile(
      'MyClass',
      'com.example.project',
      generatorManager,
      (imp) => new CompositeGeneratorNode().append(adjusted`
        public class MyClass {
          public ${imp('java.util.Properties')} getProperties() {
            // ...
          }
        }
      `)
    );

    const expectedFilePath = 'com/example/project/MyClass.java';
    const expectedContent = adjusted`
      package com.example.project;

      import java.util.Properties;

      public class MyClass {
        public Properties getProperties() {
          // ...
        }
      }
    `;

    expect(createFileMock).toHaveBeenCalledTimes(1);
    expect(createFileMock).toHaveBeenCalledWith(
      expectedFilePath,
      expectedContent,
      undefined // options parameter is undefined in this test
    );
  });
});

