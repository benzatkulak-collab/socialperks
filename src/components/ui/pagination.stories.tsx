import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Pagination } from "./pagination";

const meta: Meta<typeof Pagination> = {
  title: "UI/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 700, background: "#0C0F1A", padding: 24, borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const FewPages: Story = {
  render: function FewPagesStory() {
    const [page, setPage] = useState(1);
    return (
      <Pagination
        page={page}
        totalPages={5}
        perPage={10}
        total={47}
        onPageChange={setPage}
      />
    );
  },
};

export const ManyPages: Story = {
  render: function ManyPagesStory() {
    const [page, setPage] = useState(1);
    return (
      <Pagination
        page={page}
        totalPages={50}
        perPage={20}
        total={1000}
        onPageChange={setPage}
      />
    );
  },
};

export const ManyPagesMiddle: Story = {
  render: function ManyPagesMiddleStory() {
    const [page, setPage] = useState(25);
    return (
      <Pagination
        page={page}
        totalPages={50}
        perPage={20}
        total={1000}
        onPageChange={setPage}
      />
    );
  },
};

export const WithPerPageSelector: Story = {
  render: function WithPerPageSelectorStory() {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const total = 256;
    const totalPages = Math.ceil(total / perPage);
    return (
      <Pagination
        page={page}
        totalPages={totalPages}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setPage(1);
        }}
      />
    );
  },
};

export const CustomPerPageOptions: Story = {
  render: function CustomPerPageOptionsStory() {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const total = 500;
    const totalPages = Math.ceil(total / perPage);
    return (
      <Pagination
        page={page}
        totalPages={totalPages}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setPage(1);
        }}
        perPageOptions={[25, 50, 100, 200]}
      />
    );
  },
};

export const LastPage: Story = {
  render: function LastPageStory() {
    const [page, setPage] = useState(10);
    return (
      <Pagination
        page={page}
        totalPages={10}
        perPage={20}
        total={195}
        onPageChange={setPage}
      />
    );
  },
};
