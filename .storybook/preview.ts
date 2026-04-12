import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0C0F1A" },
        { name: "surface", value: "#141825" },
      ],
    },
  },
};

export default preview;
