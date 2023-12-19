/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import FA1_2Display from "../../components/FA1_2Display";
import { fa1_2Token } from "../../types/display";

type AliasProps = {
  address: string;
};

vi.mock("../../components/Alias", () => {
  return {
    default: ({ address }: AliasProps) => (
      <div>Alias Component with address: {address}</div>
    ),
  };
});

describe("FA1_2Display Component", () => {
  const mockCompleteData: fa1_2Token = {
    name: "TokenName",
    fa1_2_address: "tz1",
    imageUri: "http://example.com/image.jpg",
    hasDecimal: false,
  };

  it("renders correctly with complete data", () => {
    const { getByText, getByAltText } = render(
      <FA1_2Display data={mockCompleteData} />
    );
    expect(getByText("TokenName")).toBeInTheDocument();
    expect(getByAltText("TokenName")).toHaveAttribute(
      "src",
      "http://example.com/image.jpg"
    );
  });

  it("renders JSON stringified data when a field is missing", () => {
    const incompleteData = { ...mockCompleteData, name: undefined };
    const { container } = render(<FA1_2Display data={incompleteData} />);
    expect(container.firstChild).toContainHTML(JSON.stringify(incompleteData));
  });

  it("renders without an image when imageUri is missing", () => {
    const dataWithoutImageUri = { ...mockCompleteData, imageUri: undefined };
    const { queryByAltText } = render(
      <FA1_2Display data={dataWithoutImageUri} />
    );
    expect(queryByAltText("TokenName")).toBeNull();
  });
});
