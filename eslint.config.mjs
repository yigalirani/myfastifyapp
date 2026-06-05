import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { importX } from 'eslint-plugin-import-x'
import globals from 'globals';
import { defineConfig, globalIgnores } from "eslint/config";
console.log('import.meta.dirname',import.meta.dirname)
export default defineConfig(
  globalIgnores(["**/dist/", "**/types/",'**/node_modulests','**/*.js','**/ai.ts']),
  eslint.configs.recommended, //taking all rules from eslint, truning select ones off below
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,

  tseslint.configs.strictTypeChecked, //the most strict setting available
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/internal-regex': '^@generic/',
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },  
  {
    rules: { //after taking the most tstrict setting, opnioned relaxing
      'import-x/no-cycle': 'error', 
      'import-x/namespace':'off',
      'import-x/no-named-as-default-member':'off',
      "@typescript-eslint/no-unused-vars": "off", //turned off because biome does it faster
      "@typescript-eslint/no-unsafe-type-assertion":"off",
      //less than recomended
      "@typescript-eslint/no-deprecated": [
        "warn",
        {
          "allow": ["chrome"]
        }
      ],
      "@typescript-eslint/no-invalid-void-type": "off", //needed to mark function as not using this, also one routine that can retrn it.
      "@typescript-eslint/no-non-null-assertion":"off", //to many of them . also deffecult to replace it with nl for +=
      "@typescript-eslint/no-confusing-void-expression":"off", //becuse i like to do return return_void()  and also in VisitorCB
      "@typescript-eslint/restrict-template-expressions":"off", //its ok if template have numbers
      "@typescript-eslint/no-unsafe-assignment":"warn",
      "@typescript-eslint/no-unsafe-argument":"warn",
      "no-unsafe-member-access":"off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-unused-labels": "warn", //i dont like this rule because i like to orgenize long routines using labels
      "@typescript-eslint/no-unnecessary-type-parameters":"off",//i dont like this rule because it flages some usefull functions sucks as resuse_prev
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-use-before-define": [
        "warn",
        {
          "ignoreTypeReferences": false
        }
      ],
      "@typescript-eslint/restrict-plus-operands": ["warn",{allowNumberAndString:true}], //ok to add string and number
      "@typescript-eslint/only-throw-error":"warn", //aint nothing wrong with throwing a string - just check on catch
      //more than recomended
      "no-duplicate-imports":"warn",
      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "no-constant-condition":"warn",
      "@typescript-eslint/unified-signatures":"warn",//rule crashes in my case
      "@typescript-eslint/no-unsafe-call":"warn",//not easy, todo
      "no-useless-escape":"warn",
      "no-control-regex":"warn",
      "@typescript-eslint/no-unnecessary-condition": [//terible law, implmenting it resulted in bugs in the code, giving it another try 
        "warn",
        {
          "allowConstantLoopConditions": true
        },
      ],
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