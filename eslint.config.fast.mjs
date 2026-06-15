import eslint from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from "eslint/config";
console.log('import.meta.dirname',import.meta.dirname)
export default defineConfig(
  globalIgnores(["**/dist/", "**/types/",'**/node_modulests','**/*.js','**/textile.ts']),
  eslint.configs.recommended, //taking all rules from eslint, truning select ones off below


  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    }
  },  
  {
    rules: { //after taking the most tstrict setting, opnioned relaxing
      "no-unreachable-loop":"error", //this is not enabled by edfault alo its super suefull, had to tuen in own explicitly: https://chatgpt.com/share/6a2ff8ef-d360-83eb-ac7f-b961d239ac2e
      'import-x/no-cycle': 'off', 
      "import-x/default":"off",
      'import-x/namespace':'off',
      'import-x/no-named-as-default-member':'off',
      "no-unused-labels": "warn", //i dont like this rule because i like to orgenize long routines using labels
      //more than recomended
      "no-duplicate-imports":"warn",
      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "no-constant-condition":"warn",
      "no-useless-escape":"warn",
      "no-control-regex":"warn",
      "no-new": "off", //because i have u classes that i dont need reference to but i nice to package as class
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.property.name='addEventListener']:not(:matches(FunctionDeclaration[id.name='add_listener'], VariableDeclarator[id.name='add_listener'], MethodDefinition[key.name='add_listener']) *)",
          "message": "Do not use native 'addEventListener' because it does not validate event name types. Use 'add_listener' instead."
        }
      ]

    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  }
);