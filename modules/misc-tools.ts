export {assert, log}

function assert(condition: any, message = "Assertion failed") : asserts condition
{
  if (!condition) 
    throw new Error(message);
}

function log(...args: any)
{
    console.log(...args)
}  
