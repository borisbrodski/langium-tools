import { EmptyFileSystem, Grammar, LangiumDocument } from 'langium'
import { createLangiumGrammarServices } from 'langium/grammar'
import { parseHelper } from 'langium/test'
import 'vitest'
import { beforeAll, describe, expect, test } from 'vitest'
import '../../src/testing/matchers'

describe('Langium matchers', () => {
  let services: ReturnType<typeof createLangiumGrammarServices>;
  let parse: ReturnType<typeof parseHelper<Grammar>>;
  let document: LangiumDocument<Grammar> | undefined;

  beforeAll(() => {
    services = createLangiumGrammarServices(EmptyFileSystem)
    parse = parseHelper<Grammar>(services.grammar);

  })

  describe("toHaveNoErrors", () => {
    test('no errors', async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        A: a=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `, { validation: true })

      expect(document).toHaveNoErrors()
    })

    test("lexer and parser errors ", async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `)
      expect(() => {
        expect(document).toHaveNoErrors()
      }).toThrow('Lexer errors')
    })

    test("lexer and parser errors ignoring both", async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `)
      expect(document).toHaveNoErrors({ ignoreLexerErors: true, ignoreParserErors: true })
    })

    test("lexer and parser errors ignoring lexer errors", async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `)
      expect(() => {
        expect(document).toHaveNoErrors({ ignoreLexerErors: true })
      }).toThrow("Parser errors")
    })

    test("lexer and parser errors ignoring parser errors", async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `)
      expect(() => {
        expect(document).toHaveNoErrors({ ignoreParserErors: true })
      }).toThrow("Lexer errors")
    })

    test("validation errors", async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: ID;

        Unused: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `, { validation: true })
      expect(() => {
        expect(document).toHaveNoErrors()
      }).toThrow("Diagnostics")
      expect(() => {
        expect(document).toHaveNoErrors({ ignoreLexerErors: true })
      }).toThrow("Diagnostics")
      expect(() => {
        expect(document).toHaveNoErrors({ ignoreParserErors: true })
      }).toThrow("Diagnostics")
      expect(() => {
        expect(document).toHaveNoErrors({ ignoreLexerErors: true, ignoreParserErors: true })
      }).toThrow("Diagnostics")
    })

    test("validation errors ignoring diagnostics", async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: ID;

        Unused: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `, { validation: true })
      expect(document).toHaveNoErrors({ ignoreValidationErrors: true })
    })
  })
})
