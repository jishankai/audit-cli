declare module 'inquirer-fuzzy-path' {
  import { PromptModule } from 'inquirer';

  interface FuzzyPathQuestionOptions {
    type: 'fuzzypath';
    name: string;
    message: string;
    excludePath?: (nodePath: string) => boolean;
    excludeFilter?: (nodePath: string) => boolean;
    itemType?: 'any' | 'file' | 'directory';
    rootPath?: string;
    suggestOnly?: boolean;
    depthLimit?: number;
    default?: string;
    validate?: (input: string) => boolean | string;
  }

  const fuzzyPath: any;
  export default fuzzyPath;
}
