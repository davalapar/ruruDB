declare module 'tinydate' {
  function tinydate (pattern:string) : ((date: Date) => string);
  export = tinydate;
}