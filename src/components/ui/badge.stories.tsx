import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  argTypes: {
    color: {
      control: "select",
      options: ["cyan", "green", "amber", "red", "purple", "pink", "orange", "muted"],
    },
    variant: { control: "select", options: ["default", "outline"] },
    size: { control: "select", options: ["sm", "md"] },
    dot: { control: "boolean" },
  },
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Default",
    color: "cyan",
    variant: "default",
    size: "md",
  },
};

export const Success: Story = {
  args: {
    children: "Approved",
    color: "green",
    variant: "default",
    size: "md",
    dot: true,
  },
};

export const Warning: Story = {
  args: {
    children: "Pending Review",
    color: "amber",
    variant: "default",
    size: "md",
    dot: true,
  },
};

export const Danger: Story = {
  args: {
    children: "Rejected",
    color: "red",
    variant: "outline",
    size: "md",
    dot: true,
  },
};

export const Info: Story = {
  args: {
    children: "In Progress",
    color: "purple",
    variant: "default",
    size: "sm",
  },
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge color="cyan">Cyan</Badge>
      <Badge color="green">Green</Badge>
      <Badge color="amber">Amber</Badge>
      <Badge color="red">Red</Badge>
      <Badge color="purple">Purple</Badge>
      <Badge color="pink">Pink</Badge>
      <Badge color="orange">Orange</Badge>
      <Badge color="muted">Muted</Badge>
    </div>
  ),
};

export const OutlineVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge color="cyan" variant="outline">Cyan</Badge>
      <Badge color="green" variant="outline">Green</Badge>
      <Badge color="amber" variant="outline">Amber</Badge>
      <Badge color="red" variant="outline">Red</Badge>
    </div>
  ),
};

export const WithDots: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge color="green" dot>Active</Badge>
      <Badge color="amber" dot>Pending</Badge>
      <Badge color="red" dot>Offline</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Badge color="cyan" size="sm">Small</Badge>
      <Badge color="cyan" size="md">Medium</Badge>
    </div>
  ),
};
