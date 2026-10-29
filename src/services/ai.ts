// Future AI adapters must require explicit consent before receiving archive content.
// Statistics remain deterministic; no external AI is called by this release.
export interface AIConsent { grantedAt:string; fields:string[]; provider:string }
export interface StructureInterpreter { interpret(sample:unknown,consent:AIConsent):Promise<unknown> }
export interface InferredTheme {theme:string;source:string;confidence:number;modelVersion:string}
