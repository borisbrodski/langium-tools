<a id="readme-top"></a>

<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<br />
<div align="center">
  <!-- TODO
  <a href="https://github.com/borisbrodski/langium-tools">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>
  -->

  <h3 align="center">langium-tools</h3>

  <p align="center">
    A collection of tools for implementing and testing DSLs with <a href="https://langium.org/"><strong>Langium</strong>!</a>
    <br />
    <br />
    <a href="#documentation"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/borisbrodski/langium-tools/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/borisbrodski/langium-tools/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#example-project">Example project</a></li>
      </ul>
    </li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

<!--
[![Product Name Screen Shot][product-screenshot]](https://example.com)
-->

This project is a collection of tools, that should power up DSL development with Langium:

Language features:

- <strong>Helper methods</strong> - collection of helper methods, like `.toFirstUpper()`
- <strong>Generators</strong> - nice framework to generate files from AST (both in memory and on the disk)
- <strong>Issues</strong> - unified way to access, verify and print out errors and warning in DSLs

Testing features:

- Advance generator testing framework (optimized for large amount of generated code)
- `vitest` matchers and tools to test DSL validation

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

This section should list any major frameworks/libraries used to bootstrap your project. Leave any add-ons/plugins for the acknowledgements section. Here are a few examples.

- [![Typescript][Typescript]][Typescript-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

- Add package to your project
- Atart using one or more features it provides
- Check out example project to see `langium-tools` in action

### Installation

Add the package to your `package.json`

1. Install NPM packages
   ```sh
   npm install langium-tools
   ```
   <p align="right">(<a href="#readme-top">back to top</a>)</p>

### Example project

You can check out The Umltimative Example: the default langium example project <strong>statemachine</strong> enhanced with all features of `langium-tools`:

- TODO - ADD LINK HERE

## Documentation

See [typedoc documentation](https://borisbrodski.github.io/langium-tools)

### Document Issues

When working with Langium documents, it's essential to handle and report issues such as syntax errors, validation errors, and other diagnostics in a unified and user-friendly way. The langium-tools package provides utilities to simplify access to document issues from different sources (lexer, parser, validation) and to generate comprehensive summaries of these issues.

#### Features

- **Unified Issue Access**: Collect all issues from a LangiumDocument, including lexer errors, parser errors, and validation diagnostics.
- **Customizable Filtering**: Optionally filter issues based on their source or severity.
- **Issue Summarization**: Generate summaries of issues with counts and formatted messages.
- **Formatted Issue Strings**: Convert issues into human-readable strings for logging or displaying.

#### Getting Issues from a Document

To retrieve issues from a LangiumDocument, use the getDocumentIssues function:

```typescript
import { getDocumentIssues } from "langium-tools";

const issues = getDocumentIssues(document);
```

By default, getDocumentIssues collects all issues from the lexer, parser, and validation phases.
You can customize which issues to include using the optional parameters:

```typescript
const issues = getDocumentIssues(document, {
  skipNonErrorDiagnostics: true, // Skip warnings, information, hints
  skipLexerErrors: false, // Include lexer errors
  skipParserErrors: false, // Include parser errors
  skipValidation: false, // Include validation issues
});
```

#### Generating an Issue Summary

To get a summary of the issues in a document, use the getDocumentIssueSummary function:

```typescript
import { getDocumentIssueSummary } from "langium-tools";

const summary = getDocumentIssueSummary(document);

console.log(summary.summary); // e.g., "1 lexer error(s), 2 validation error(s)"
console.log(summary.message);
/*
Lexer Errors:
Error at 3:15 - Unexpected character

Validation Diagnostics:
Error at 5:10 - Undefined reference to 'myVar'
Warning at 8:5 - Deprecated usage of 'oldFunc'

1 lexer error(s), 2 validation issue(s)
*/
```

The DocumentIssueSummary object contains:

- `countTotal`: Total number of issues
- `countErrors`: Number of issues with severity ERROR
- `countNonErrors`: Number of issues with severity other than ERROR
- `summary`: A brief summary string
- `message`: A detailed message listing all issues

#### Converting Issues to Strings

You can convert individual issues to formatted strings using documentIssueToString:

```typescript
import { documentIssueToString } from "langium-tools";

issues.forEach((issue) => {
  const issueStr = documentIssueToString(issue);
  console.log(issueStr);
});

// Output:
// Error at 3:15 - Unexpected character
// Warning at 5:10 - Deprecated usage of 'oldFunc'
```

#### Issue Types and Severities

The module defines the following enums for issue sources and severities:

**DocumentIssueSource**

- `LEXER`: Issues originating from the lexer (tokenization errors).
- `PARSER`: Issues originating from the parser (syntax errors).
- `VALIDATION`: Issues originating from validation (semantic errors).

**DocumentIssueSeverity**

- `ERROR`: Critical issues that prevent further processing.
- `WARNING`: Issues that may lead to problems but do not prevent processing.
- `INFORMATION`: Informational messages.
- `HINT`: Suggestions to improve the document.
- `UNKNOWN`: Severity is unknown.

#### API Reference

For detailed API documentation, see the Typedoc documentation.

- [getDocumentIssueSummary](https://borisbrodski.github.io/langium-tools/functions/base.getDocumentIssueSummary.html)
- [getDocumentIssues](https://borisbrodski.github.io/langium-tools/functions/base.getDocumentIssues.html)
- [documentIssueToString](https://borisbrodski.github.io/langium-tools/functions/base.documentIssueToString.html)
- [DocumentIssue](https://borisbrodski.github.io/langium-tools/interfaces/base.DocumentIssue.html)
- [DocumentIssueSummary](https://borisbrodski.github.io/langium-tools/interfaces/base.DocumentIssueSummary.html)
- [DocumentIssueSource](https://borisbrodski.github.io/langium-tools/enums/base.DocumentIssueSource.html)
- [DocumentIssueSeverity](https://borisbrodski.github.io/langium-tools/enums/base.DocumentIssueSeverity.html)

#### Notes

- The position information in issues is zero-based for both lines and columns.
- The utilities handle the potential absence of position data gracefully.
- Ensure that you have imported the necessary functions from langium-tools in your project.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Generated Content Manager

The `GeneratedContentManager` class provides a unified API for code generation in Langium projects. It allows you to collect generated files in memory, manage multiple output targets, and write the generated content to the filesystem. This is especially useful for snapshot testing, where you can compare the in-memory generated content against saved snapshots to ensure no unintended changes have occurred.

#### Features

- **Unified Generator API**: Simplify code generation with a consistent interface.
- **In-Memory Generation**: Collect generated files in memory for flexible processing.
- **Multiple Targets**: Support multiple output directories (targets) with custom overwrite settings.
- **Snapshot Testing Support**: Facilitate testing by comparing in-memory generated content with committed snapshots.

#### Getting Started with GeneratedContentManager

To use the `GeneratedContentManager`, you need to:

1. Create an instance of `GeneratedContentManager`, optionally providing a list of workspace URIs.
2. Generate content for your models using `GeneratorManager`.
3. Write the generated content to disk using `writeToDisk`.

##### Example Usage

```typescript
import { GeneratedContentManager } from "langium-tools";

// Create a new manager
const manager = new GeneratedContentManager(optionalListOfWorkspaceURIs);

// Generate content for multiple models
generator(manager.generatorManagerFor(model1));
generator(manager.generatorManagerFor(model2));

// Write the generated content to disk
await manager.writeToDisk("./generated");
```

##### Implementing a Generator Function

Here's how you might implement a generator function using `GeneratorManager`:

```typescript
function generator(manager: GeneratorManager) {
  const model = manager.getModel();
  const document = manager.getDocument();
  const workspaceURI = manager.getWorkspaceURI();
  const localPath = manager.getDocumentLocalPath();

  // Generate files
  manager.createFile(
    "src-gen/abstract_process.ts",
    "// Generated by Langium. Do not edit.",
  );
  manager.createFile("src/process.ts", "// Initially generated by Langium", {
    overwrite: false,
  });
}
```

#### Managing Generated Content

The `GeneratedContentManager` allows you to collect and manage generated files before writing them to disk. This can be particularly useful for testing and validation purposes.

##### Creating Files

Use the `createFile` method of `GeneratorManager` to add files to the generated content:

```typescript
manager.createFile(filePath: string, content: string, options?: CreateFileOptions);
```

- `filePath`: The relative path to the file within the output directory.
- `content`: The content to be written to the file.
- `options`: Optional settings, such as overwrite and target.

##### Overwrite Behavior

By default, files are overwritten when written to disk. You can control this behavior using the `overwrite` option:

```typescript
manager.createFile("src/process.ts", "// Initially generated by Langium", {
  overwrite: false,
});
```

#### Working with Targets

Targets represent different output directories or configurations. You can define multiple targets with custom settings.

Adding a Target

```typescript
manager.addTarget({
  name: "CUSTOM_TARGET",
  overwrite: false,
});
```

##### Using Targets

Specify the target when creating files:

```typescript
manager.createFile("src/custom.ts", "// Custom target content", {
  target: "CUSTOM_TARGET",
});
```

##### Writing to Disk

After generating content, use writeToDisk to write all collected files to the filesystem:

```typescript
await manager.writeToDisk(outputDir: string, target?: string);
```

- `outputDir`: The directory where files will be written.
- `target`: Optional target name. If not provided, the default target is used.

#### API Reference

For detailed API documentation, see the Typedoc documentation.

- [GeneratedContentManager](https://borisbrodski.github.io/langium-tools/classes/generator.GeneratedContentManager.html)
- [GeneratorManager](https://borisbrodski.github.io/langium-tools/classes/generator.GeneratorManager.html)
- [GeneratorTarget](https://borisbrodski.github.io/langium-tools/interfaces/generator.GeneratorTarget.html)
- [CreateFileOptions](https://borisbrodski.github.io/langium-tools/interfaces/generator.CreateFileOptions.html)

#### Notes

- **Workspace URIs**: When creating a GeneratedContentManager, you can provide workspace URIs to help determine relative paths for documents.
- **Conflict Detection**: The manager detects conflicts if the same file is generated multiple times with different content or overwrite settings.
- **Asynchronous Operations**: Writing to disk is asynchronous and returns a promise.

#### Example: Full Workflow

```typescript
import { GeneratedContentManager, GeneratorManager } from "langium-tools";

// Initialize the manager
const manager = new GeneratedContentManager(["./workspace"]);

// Define a generator function
function generateCode(manager: GeneratorManager) {
  const model = manager.getModel();
  // Generate code based on the model
  manager.createFile("model.ts", `// Code for model ${model.name}`);
}

// Generate code for models
const models = [model1, model2];
models.forEach((model) => {
  const genManager = manager.generatorManagerFor(model);
  generateCode(genManager);
});

// Write all generated content to disk
await manager.writeToDisk("./generated");
```

#### Error Handling

The GeneratedContentManager provides informative error messages when conflicts occur or when file operations fail, helping you quickly identify and resolve issues.

#### Use Cases

- **Modular Code Generation**: Manage code generation for multiple models or modules in a unified way.
- **Testing Generators**: Use in-memory content collection to test your generators without writing to disk.
- **Custom Build Pipelines**: Integrate with build systems by controlling when and how generated content is written.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Generator Testing (Snapshot Testing)

Testing code generators is crucial to ensure that changes in your generator logic do not introduce unintended side effects. The `langium-tools` package provides utilities for generator snapshot testing, allowing you to verify that your generators produce the expected output over time.

#### Overview

The main idea is to:

- **Commit generated content** to your version control system (e.g., Git).
- **Run tests in verify mode** to ensure generators have not changed unintentionally.
- **Approve changes** by regenerating snapshots and reviewing diffs when intentional changes are made.

#### Features

- **Automated Generator Tests**: Run tests across multiple DSL workspaces to verify generator output.
- **Snapshot Verification**: Compare in-memory generated content against committed snapshots.
- **Flexible Modes**: Switch between generate mode (to update snapshots) and verify mode (to validate output).

#### Getting Started with Generator Testing

To use generator testing utilities, you need to:

1. Define generator test options.
2. Set up test suites using langiumGeneratorSuite.
3. Configure your test scripts to handle generate and verify modes.

Example Usage

```typescript
// test/generator.test.ts
import { langiumGeneratorSuite } from "langium-tools/testing";
import { createMyDslServices } from "../src/language/my-dsl-module";
import { generate } from "../src/cli/generator";

describe("Langium code generator tests", () => {
  langiumGeneratorSuite("./test-workspaces", {
    createServices: () => createMyDslServices,
    generateForModel: generate,
  });
});
```

#### Defining Generator Test Options

The `GeneratorTestOptions` interface allows you to specify how the generator tests should run:

- `createServices`: Function to create your language services.
- `initWorkspace`: (Optional) Initialize the workspace.
- `buildDocuments`: (Optional) Build documents from the workspace.
- `validateDocuments`: (Optional) Validate the documents before generation.
- `generateForWorkspace`: (Optional) Custom logic to generate content for the entire workspace.
- `generateForModel`: Custom logic to generate content for a single model.

#### Configuring Test Scripts

In your package.json, you can define scripts to run tests in different modes:

```json
{
  "scripts": {
    "test": "GENERATOR_TEST=verify vitest run",
    "test:generate": "GENERATOR_TEST=generate vitest run"
  }
}
```

- **Verify Mode**: Runs tests to verify that the generator output matches the committed snapshots.
- **Generate Mode**: Regenerates the snapshots and updates the committed files.

#### Writing Generator Tests

The `langiumGeneratorSuite` function automatically discovers subdirectories in your test suite directory and runs tests for each DSL workspace.

##### Example Directory Structure

```
test-workspaces/
├── workspace1/
│   ├── dsls/
│   │   └── example1.mydsl
│   └── generated/
│       └── generated-code.ts
├── workspace2/
│   ├── dsls/
│   │   └── example2.mydsl
│   └── generated/
│       └── generated-code.ts
```

#### Running Tests

- **Verify Mode**:

```bash
npm test
```

Ensures that the generator output matches the committed `generated` directories.

- **Generate Mode**:

```bash
npm run test:generate
```

Updates the `generated` directories with new output from the generators.

#### Approving Changes

When you intentionally change your generator logic, you can:

1. Run `npm run test:generate` to regenerate the output.
2. Review the changes using `git diff`.
3. Commit the updated generated content to approve the changes.

#### Under the Hood

The generator testing utilities work by:

- Collecting generated content in memory using `GeneratedContentManager`.
- Writing the generated content to disk in generate mode.
- Comparing the in-memory content against the committed files in verify mode.

#### API Reference

For detailed API documentation, see the [Typedoc documentation](https://borisbrodski.github.io/langium-tools).

- [langiumGeneratorSuite](https://borisbrodski.github.io/langium-tools/functions/testing.langiumGeneratorSuite.html)
- [GeneratorTestOptions](https://borisbrodski.github.io/langium-tools/interfaces/testing.GeneratorTestOptions.html)
- [GeneratedContentManager](https://borisbrodski.github.io/langium-tools/classes/generator.GeneratedContentManager.html)

#### Notes

- **Environment Variable**: The `GENERATOR_TEST` environment variable controls the test mode (`verify` or `generate`).
- **Testing Framework**: The examples use `vitest`, but the utilities can be used with any testing framework, if you are not using automatic workspace discovery, but rather define one test for one workspace using [langiumGeneratorTest](https://borisbrodski.github.io/langium-tools/functions/testing.langiumGeneratorTest.html).

#### Example Workflow

1. Initial Setup:

- Write your generator logic.
- Run `npm run test:generate` to generate initial snapshots.
- Commit the `generated` directories to your version control system.

2. Continuous Testing:

- Run `npm test` during development to ensure your generators produce consistent output.

3. Updating Generators:

- Make changes to your generator logic.
- Run `npm test` to see if tests fail (they should if output changes).
- Run `npm run test:generate` to update the snapshots.
- Review changes with `git diff`.
- Commit the changes to approve them.

#### Additional Configuration

You can customize the behavior by providing custom implementations for optional functions in `GeneratorTestOptions`:

- `initWorkspace`: Customize how the workspace is initialized.
- `buildDocuments`: Control how documents are built from the workspace.
- `validateDocuments`: Implement custom validation logic before generation.
- `generateForWorkspace`: Generate content at the workspace level instead of per model.

#### Example: Custom Validation

```typescript
function customValidateDocuments(services, documents) {
  documents.forEach((doc) => {
    const issues = getDocumentIssues(doc);
    expect(issues.length).toBe(0);
  });
}

langiumGeneratorSuite("./test-workspaces", {
  createServices: () => createMyDslServices(),
  validateDocuments: customValidateDocuments,
  generateForModel: async (services, model, generatorManager) => {
    // Generator logic
  },
});
```

#### Error Handling

The testing utilities provide detailed error messages when:

- Generated files do not match the committed snapshots.
- Unexpected files are found in the generated directories.
- Metadata mismatches occur, e.g. `overwrite` flag.

Use Cases

- **Regression Testing**: Ensure that changes to your generators do not introduce regressions.
- **Collaboration**: Facilitate code reviews by providing clear diffs of generator output.
- **Automation**: Integrate into CI/CD pipelines for automated testing.

#### Conclusion

Generator snapshot testing is a powerful technique to maintain the integrity of your code generators. By integrating these testing utilities into your workflow, you can confidently evolve your generators while ensuring consistent output.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->

## Roadmap

- [ ] Split packages into `langium-tools` and `langium-test-tools` NPM packages to prevent test helper classes to be released with production code
- [ ] Add more documentation

See the [open issues](https://github.com/borisbrodski/langium-tools/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Top contributors:

<a href="https://github.com/borisbrodski/langium-tools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=borisbrodski/langium-tools" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Boris Brodski - [@BorisBrodski](https://x.com/BorisBrodski) - brodsky_boris@yahoo.com

Project Link: [https://github.com/borisbrodski/langium-tools](https://github.com/borisbrodski/langium-tools)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [Langium](https://langium.org/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/borisbrodski/langium-tools.svg?style=for-the-badge
[contributors-url]: https://github.com/borisbrodski/langium-tools/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/borisbrodski/langium-tools.svg?style=for-the-badge
[forks-url]: https://github.com/borisbrodski/langium-tools/network/members
[stars-shield]: https://img.shields.io/github/stars/borisbrodski/langium-tools.svg?style=for-the-badge
[stars-url]: https://github.com/borisbrodski/langium-tools/stargazers
[issues-shield]: https://img.shields.io/github/issues/borisbrodski/langium-tools.svg?style=for-the-badge
[issues-url]: https://github.com/borisbrodski/langium-tools/issues
[license-shield]: https://img.shields.io/github/license/borisbrodski/langium-tools.svg?style=for-the-badge
[license-url]: https://github.com/borisbrodski/langium-tools/blob/master/LICENSE.txt
[product-screenshot]: images/screenshot.png
[Typescript]: https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square
[Typescript-url]: https://www.typescriptlang.org/
