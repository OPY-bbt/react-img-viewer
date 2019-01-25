export const cls = (classes: { [key: string]: boolean; }): string => {
  return Object
    .keys(classes)
    .filter((k) => classes[k])
    .join(" ");
};
