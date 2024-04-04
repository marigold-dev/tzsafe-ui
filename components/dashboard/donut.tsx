import { Chart as ChartJS, ArcElement, Legend, Tooltip } from "chart.js";
import { useCallback, useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Defi } from "../../utils/tzktHooks";

ChartJS.register(ArcElement, Tooltip, Legend);

type DonutProps = {
  title: string;
  colors: string[];
  tokens: Defi[];
};

const Donut = ({ title, colors, tokens }: DonutProps) => {
  const tokenSample = useMemo(() => {
    // We only need 4 tokens, the 5th one is the sum of the remaining
    const tokenSample = tokens.reduceRight<Array<Defi>>((acc, token) => {
      if (acc.length === 5) {
        acc[4].balance += token.balance;
        return acc;
      } else if (acc.length === 4) {
        return [
          ...acc,
          { balance: token.balance, symbol: "Others", contract: "", icon: "" },
        ];
      } else {
        return [...acc, token];
      }
    }, []);
    return tokenSample;
  }, [tokens]);

  // Adding a greater contrast on the border creates a better contrast
  const data = {
    labels: tokenSample.map(token => token.symbol),
    datasets: [
      {
        data: tokenSample.map(token => token.balance),
        backgroundColor: colors.map(color => color + "C0"), // Add an opacity
        borderColor: colors.map(color => color + "FF"), // Add a greater opacity
        borderWidth: 1,
        weight: 1,
      },
    ],
  };

  const options = {
    cutout: "80%", // The size of the donut hole
    plugins: {
      legend: {
        display: false, // we don't need the legend because it's displayed in "Assets" component
      },
      tooltip: {
        usePointStyle: true,
        callbacks: {
          title: (context: any) => {
            return context.label;
          },
          label: (context: any) => {
            return " " + context.parsed; // Adding a space to mimic margin left
          },
          labelPointStyle: (context: any) => {
            // Add the icon image in the tooltip
            const image = new Image(15, 15);
            const token = tokens.find(token => token.symbol == context.label);
            image.src = token?.icon || "";
            return {
              pointStyle: image,
              rotation: 0, // The rotation has to be set otherwise typescript complains
            };
          },
        },
      },
    },
  };

  return (
    <div>
      <div className="mb-2 text-xl">{title}</div>
      <div className="self-center" style={{ height: "256px", width: "256px" }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
};

export default Donut;
