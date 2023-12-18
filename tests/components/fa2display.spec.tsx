/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import FA2Display from "../../components/FA2Display";

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

describe("FA2Display", () => {
  it("renders with valid data", () => {
    const validData = JSON.stringify([
      {
        fa2_address: "Test FA2 Address",
        name: "Test Name",
        token_id: 123,
        to: "Test To Address",
        imageUri: "https://example.com/test.jpg",
        amount: "100",
      },
    ]);

    render(<FA2Display data={validData} />);
    expect(screen.getByText("Test Name")).toBeInTheDocument();
    expect(
      screen.getByText("Alias Component with address: Test FA2 Address")
    ).toBeInTheDocument();
    expect(screen.getByAltText("Test Name")).toHaveAttribute(
      "src",
      "https://example.com/test.jpg"
    );
  });

  it("does not render an image when imageUri is missing", () => {
    const dataWithoutImageUri = JSON.stringify([
      {
        fa2_address: "Test FA2 Address",
        name: "Test Name",
        token_id: 123,
        to: "Test To Address",
        amount: "100",
      },
    ]);

    render(<FA2Display data={dataWithoutImageUri} />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders empty component with empty array data", () => {
    const emptyData = JSON.stringify([]);

    render(<FA2Display data={emptyData} />);
    expect(screen.queryByText("Name:")).toBeNull();
  });

  it("renders error message with valid JSON data but unexpected data", () => {
    const invalidData = JSON.stringify("Invalid data");

    render(<FA2Display data={invalidData} />);
    expect(screen.getByText(invalidData)).toBeInTheDocument();
  });

  it("renders error message with invalid JSON data", () => {
    const invalidData = "Invalid JSON";

    render(<FA2Display data={invalidData} />);
    expect(screen.getByText(invalidData)).toBeInTheDocument();
  });
});
