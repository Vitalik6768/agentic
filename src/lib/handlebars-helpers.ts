import Handlebars from "handlebars";

let helpersRegistered = false;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const registerHandlebarsHelpers = () => {
  if (helpersRegistered) return;
  helpersRegistered = true;

  Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(jsonString);
  });

  Handlebars.registerHelper("add", (a, b) => toNumber(a) + toNumber(b));
  Handlebars.registerHelper("sub", (a, b) => toNumber(a) - toNumber(b));
  Handlebars.registerHelper("mul", (a, b) => toNumber(a) * toNumber(b));
  Handlebars.registerHelper("div", (a, b) => {
    const denominator = toNumber(b);
    if (denominator === 0) return 0;
    return toNumber(a) / denominator;
  });
  Handlebars.registerHelper("mod", (a, b) => {
    const denominator = toNumber(b);
    if (denominator === 0) return 0;
    return toNumber(a) % denominator;
  });

  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("ne", (a, b) => a !== b);
  Handlebars.registerHelper("gt", (a, b) => toNumber(a) > toNumber(b));
  Handlebars.registerHelper("gte", (a, b) => toNumber(a) >= toNumber(b));
  Handlebars.registerHelper("lt", (a, b) => toNumber(a) < toNumber(b));
  Handlebars.registerHelper("lte", (a, b) => toNumber(a) <= toNumber(b));
  Handlebars.registerHelper("and", (a, b) => Boolean(a) && Boolean(b));
  Handlebars.registerHelper("or", (a, b) => Boolean(a) || Boolean(b));
  Handlebars.registerHelper("not", (a) => !Boolean(a));
};
