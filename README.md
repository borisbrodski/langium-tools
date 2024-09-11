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
* <string>Helper methods</strong> - collection of helper methods, like `.toFirstUpper()`
* <strong>Generators</strong> - nice framework to generate files from AST (both in memory and on the disk)
* <strong>Issues</strong> - unified way to access, verify and print out errors and warning in DSLs

Testing features:
* Advance generator testing framework (optimized for large amount of generated code)
* `vitest` matchers and tools to test DSL validation

<p align="right">(<a href="#readme-top">back to top</a>)</p>


### Built With

This section should list any major frameworks/libraries used to bootstrap your project. Leave any add-ons/plugins for the acknowledgements section. Here are a few examples.

* [![Typescript][Typescript]][Typescript-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

* Add package to your project
* Atart using one or more features it provides
* Check out example project to see `langium-tools` in action

### Installation

Add the package to your `package.json`

1. Install NPM packages
   ```sh
   npm install langium-tools
   ```
<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Example project

You can check out The Umltimative Example: the default langium example project <strong>statemachine</strong> enhanced with all features of `langium-tools`:

* TODO - ADD LINK HERE

## Documentation

### Generators

TODO


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

* [Langium](https://langium.org/)

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
