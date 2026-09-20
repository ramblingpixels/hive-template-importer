import { NextResponse } from "next/server";

import { DatabaseConfigurationError } from "@/lib/db";
import { ImportValidationError } from "@/lib/importer/parse";

export function apiError(error: unknown) {
  if (error instanceof ImportValidationError) {
    return NextResponse.json(
      { error: error.message, warnings: error.warnings },
      { status: 422 },
    );
  }
  if (error instanceof DatabaseConfigurationError) {
    return NextResponse.json(
      { error: error.message, code: "DATABASE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: "Something went wrong. No data was changed." },
    { status: 500 },
  );
}

