import { parseSpectoraRows } from "@/lib/importer/parse";
import type { ParsedTemplate } from "@/types/template";

export function createDemoTemplate(): ParsedTemplate {
  const rows = [
    [
      "Section Name",
      "Item Name",
      "Comment Name",
      "Comment Text",
      "Comment Type",
      "Category",
      "Recommendation (from list)",
      "Order (w/i item)",
      "Default Location",
      "Uses",
    ],
    ["Roof", "Roof Covering", "Asphalt shingles", "<p>Architectural asphalt shingles were observed.</p>", "info", "", "", "0", "Roof", "142"],
    ["Roof", "Roof Covering", "Damaged shingles", "<p>Damaged shingles were observed near the <strong>north slope</strong>. Recommend evaluation and repair by a qualified roofing contractor.</p>", "defect", "1", "Roofer", "1", "North slope", "38"],
    ["Roof", "Flashing", "Kick-out flashing", "<p>Kick-out flashing was not installed where the roof edge terminates at the sidewall. <a href=\"https://example.com/flashing\">Learn why this matters</a>.</p>", "defect", "0", "Roofer", "0", "East wall", "24"],
    ["Exterior", "Siding", "Fiber cement siding", "<p>The visible exterior wall covering was fiber cement lap siding.</p>", "info", "", "", "0", "Exterior", "98"],
    ["Exterior", "Siding", "Clearance to grade", "<p>Limited clearance was present between siding and grade. Maintain manufacturer-recommended clearance to reduce moisture damage.</p>", "defect", "0", "General contractor", "1", "South elevation", "46"],
    ["Electrical", "Service Equipment", "Main disconnect", "<p>The main service disconnect was rated at <strong>200 amps</strong>.</p>", "info", "", "", "0", "Garage", "201"],
    ["Electrical", "Service Equipment", "Open knockout", "<p>An open knockout was present in the service panel enclosure. Install an approved filler to prevent accidental contact with energized components.</p>", "defect", "1", "Electrician", "1", "Garage", "17"],
    ["Plumbing", "Water Heater", "Water heater information", "<p>A gas-fired tank water heater was installed. Verify age and remaining service life from the data plate.</p>", "info", "", "", "0", "Utility room", "132"],
    ["Plumbing", "Water Heater", "Missing discharge pipe", "<p>The temperature-pressure relief valve lacked a compliant discharge pipe. Recommend correction by a licensed plumber.</p>", "defect", "1", "Plumber", "1", "Utility room", "31"],
  ];

  return parseSpectoraRows({
    rows,
    filename: "SYNTHETIC_Spectora_HTML_Text_Demo.xlsx",
    sheetName: "Template",
    fingerprint: "synthetic-demo-not-a-customer-export",
  });
}

