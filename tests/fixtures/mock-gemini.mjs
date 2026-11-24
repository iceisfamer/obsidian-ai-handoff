#!/usr/bin/env node
let input = ''; for await (const chunk of process.stdin) input += chunk;
input = JSON.parse(input).message.content;
const emit = value => process.stdout.write(JSON.stringify(value) + '\n');
if (input === 'LOGIN') { process.stderr.write('Missing authentication credentials'); process.exit(1); }
emit({ event:'init', conversation_id:'gemini-session' });
if (input === 'WAIT') { setInterval(() => {}, 1000); }
else if (input === 'FAIL') { emit({event:'result',result:{status:'ERROR',error:'Test failure'}}); }
else if (input === 'EMPTY') { emit({event:'result',result:{status:'SUCCESS'}}); }
else {
 if (input === 'RESUME' && process.argv[process.argv.indexOf('--conversation') + 1] !== 'gemini-session') process.exit(3);
 emit({event:'step_update',step_update:{step_type:'agent_response',text_delta:'第一段'}});
 emit({event:'step_update',step_update:{step_type:'agent_response',text_delta:'第二段'}});
 emit({event:'result',result:{status:'SUCCESS',response:'第一段第二段'}});
}
