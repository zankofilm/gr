'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const filename=path.join(__dirname,'..','App.js');
const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:'App.jsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
const errors=(output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
if(errors.length){for(const e of errors)console.error(ts.flattenDiagnosticMessageText(e.messageText,'\n'));process.exit(1);}
console.log('OK: App.js JSX parsed and transpiled by TypeScript');
