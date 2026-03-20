export type SpecialtyTrack =
  | "clinica-medica"
  | "cardiologia"
  | "endocrinologia"
  | "nefrologia"
  | "pediatria"
  | "psiquiatria"
  | "ortopedia";

export function inferSpecialtyTrack(specialty?: string | null): SpecialtyTrack | null {
  const normalized = normalizeSpecialty(specialty);

  if (!normalized) {
    return null;
  }

  if (normalized.includes("cardio")) {
    return "cardiologia";
  }

  if (normalized.includes("endocrino")) {
    return "endocrinologia";
  }

  if (normalized.includes("nefro")) {
    return "nefrologia";
  }

  if (normalized.includes("pedi")) {
    return "pediatria";
  }

  if (normalized.includes("psiqu")) {
    return "psiquiatria";
  }

  if (normalized.includes("orto")) {
    return "ortopedia";
  }

  if (normalized.includes("clinica")) {
    return "clinica-medica";
  }

  return null;
}

function normalizeSpecialty(input?: string | null) {
  return input
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
