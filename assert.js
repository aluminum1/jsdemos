function assert(condition, message = "Assertion failed") 
{
  if (!condition) 
    throw new Error(message);
}

//@ts-ignore
function log(...args)
{
    console.log(...args)
}  
