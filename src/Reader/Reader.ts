export const read = (input: string): Record<string, unknown[]> => {
  try {
    // Attempt to parse input as a JSON object
    const content = JSON.parse(input);

    if (Array.isArray(content)) {
      return {
        root: content,
      };
    }

    return content;
  } catch (e) {
    // Do nothing
  }

  // Assume file is a flat file
  return {
    root: input
      .split('\n')
      .filter((item) => !/^\s*$/.test(item))
      .map((item) => JSON.parse(item)),
  };
};
