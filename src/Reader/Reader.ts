export const read = (input: string): Record<string, unknown[]> => {
  try {
    // Attempt to parse input as a JSON object
    return JSON.parse(input);
  } catch (e) {
    // Do nothing
  }

  // Assume file is a flat file
  return {
    root: input.split('\n').filter((item) => !/^\s*$/.test(item)).map((item) => JSON.parse(item)),
  };
};
