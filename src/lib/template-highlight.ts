export const TEMPLATE_TOKEN_REGEX = /(\{\{[\s\S]*?\}\})/g;

export const splitTemplateSegments = (value: string) => {
  return value.split(TEMPLATE_TOKEN_REGEX);
};

export const isTemplateSegment = (segment: string) => {
  return /^\{\{[\s\S]*\}\}$/.test(segment);
};
