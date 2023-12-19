/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import FA2Display from "../../components/FA2Display";
import { fa2Tokens } from "../../types/display";

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
describe("FA2Display Component", () => {
  const completeData: fa2Tokens = [
    {
      name: "Token1",
      fa2_address: "tz1",
      token_id: 1,
      to: "tz2",
      amount: BigNumber(10),
      hasDecimal: false,
      imageUri: "http://example.com/image.jpg",
    },
  ];

  it("renders correctly with complete data", () => {
    const { getByText, getByAltText } = render(
      <FA2Display data={completeData} />
    );
    expect(getByText("Token1")).toBeInTheDocument();
    expect(getByText("Alias Component with address: tz1")).toBeInTheDocument();
    expect(getByAltText("Token1")).toHaveAttribute(
      "src",
      "http://example.com/image.jpg"
    );
    expect(getByText("Alias Component with address: tz2")).toBeInTheDocument();
    expect(getByText("10*")).toBeInTheDocument();
  });

  it("renders JSON stringified data when a field is missing", () => {
    const incompleteData = [{ ...completeData[0], name: undefined }];
    const { container } = render(<FA2Display data={incompleteData} />);
    expect(container.firstChild).toContainHTML(JSON.stringify(incompleteData));
  });

  it("renders without an image when imageUri is missing", () => {
    const dataWithoutImageUri = [{ ...completeData[0], imageUri: undefined }];
    const { queryByAltText } = render(
      <FA2Display data={dataWithoutImageUri} />
    );
    expect(queryByAltText("Token1")).toBeNull();
  });

  it("renders amount correctly with hasDecimal true and false", () => {
    const { getByText } = render(<FA2Display data={completeData} />);
    expect(getByText("10*")).toBeInTheDocument();

    const dataWithDecimal = [{ ...completeData[0], hasDecimal: true }];
    const { getByText: getByTextWithDecimal } = render(
      <FA2Display data={dataWithDecimal} />
    );
    expect(getByTextWithDecimal("10")).toBeInTheDocument();
  });
});
