/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import FA1_2Display from "../../components/FA1_2Display";

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

describe("FA1_2Display", () => {
  it("renders with valid data", () => {
    const validData = {
      name: "Test Name",
      fa1_2_address: "Test Address",
      imageUri: "https://example.com/test.jpg",
    };

    render(<FA1_2Display data={JSON.stringify(validData)} />);
    expect(screen.getByText("Test Name")).toBeInTheDocument();
    expect(
      screen.getByText("Alias Component with address: Test Address")
    ).toBeInTheDocument();
    expect(screen.getByAltText("Test Name")).toHaveAttribute(
      "src",
      "https://example.com/test.jpg"
    );
  });

  it("does not render image when imageUri is missing", () => {
    const noImageUriData = {
      name: "Test Name",
      fa1_2_address: "Test Address",
    };

    render(<FA1_2Display data={JSON.stringify(noImageUriData)} />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders an error message with valid JSON data but unexpected data", () => {
    const invalidData = JSON.stringify("Invalid data");

    render(<FA1_2Display data={JSON.stringify(invalidData)} />);
    expect(screen.getByText(JSON.stringify(invalidData))).toBeInTheDocument();
  });

  it("renders an error message with invalid JSON data", () => {
    const invalidData = "Invalid JSON";

    render(<FA1_2Display data={invalidData} />);
    expect(screen.getByText(invalidData)).toBeInTheDocument();
  });
});
