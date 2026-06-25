import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DateRangeDialog } from "./DateRangeDialog";

describe("DateRangeDialog", () => {
  it("seeds the From and To inputs from props", () => {
    render(
      <DateRangeDialog
        from="2020-01-01"
        to="2020-12-31"
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("From")).toHaveValue("2020-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2020-12-31");
  });

  it("applies the entered values and closes", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <DateRangeDialog from="" to="" onApply={onApply} onClose={onClose} />,
    );

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2021-02-03" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2021-03-04" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith("2021-02-03", "2021-03-04");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("swaps the bounds on Apply when From is after To", () => {
    const onApply = vi.fn();
    render(
      <DateRangeDialog from="" to="" onApply={onApply} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2021-12-31" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2021-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith("2021-01-01", "2021-12-31");
  });

  it("Clear emits an empty range", () => {
    const onApply = vi.fn();
    render(
      <DateRangeDialog
        from="2020-01-01"
        to="2020-12-31"
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onApply).toHaveBeenCalledWith("", "");
  });
});
