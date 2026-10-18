import { describe, expect, it } from "vitest";
import { findErrorFocusTarget, type QueryableElement } from "./form-error-target";

/** Nodo falso con un motor de selectores mínimo (tag, [attr], [attr="v"], :not(), :checked, :disabled). */
class FakeEl implements QueryableElement {
  constructor(
    readonly name: string,
    readonly attrs: Record<string, string> = {},
    readonly children: FakeEl[] = [],
    readonly tag = "div",
  ) {}

  getAttribute(attr: string) {
    return this.attrs[attr] ?? null;
  }

  querySelector(selectors: string): FakeEl | null {
    const list = selectors.split(",").map((s) => s.trim());
    const walk = (nodes: FakeEl[]): FakeEl | null => {
      for (const node of nodes) {
        if (list.some((s) => node.matches(s))) return node;
        const found = walk(node.children);
        if (found) return found;
      }
      return null;
    };
    return walk(this.children);
  }

  matches(compound: string): boolean {
    const token = /^[a-z]+|\[([\w-]+)(?:="([^"]*)")?\]|:not\(([^)]*)\)|:(checked|disabled)/g;
    let consumed = 0;
    for (const m of compound.matchAll(token)) {
      if (m.index !== consumed) throw new Error(`Selector no soportado: ${compound}`);
      consumed += m[0].length;
      const [whole, attr, value, negated, pseudo] = m;
      if (attr !== undefined) {
        const actual = this.getAttribute(attr);
        if (actual === null || (value !== undefined && actual !== value)) return false;
      } else if (negated !== undefined) {
        if (this.matches(negated)) return false;
      } else if (pseudo !== undefined) {
        if (this.getAttribute(pseudo) === null) return false;
      } else if (this.tag !== whole) {
        return false;
      }
    }
    if (consumed !== compound.length) throw new Error(`Selector no soportado: ${compound}`);
    return true;
  }
}

const radio = (name: string, attrs: Record<string, string> = {}) => new FakeEl(name, { role: "radio", ...attrs }, [], "button");
const form = (...children: FakeEl[]) => new FakeEl("form", {}, children, "form");

describe("findErrorFocusTarget", () => {
  it("elige el primer campo con aria-invalid", () => {
    const input = new FakeEl("nickname", { "aria-invalid": "true" }, [], "input");
    const other = new FakeEl("email", { "aria-invalid": "true" }, [], "input");
    expect(findErrorFocusTarget(form(new FakeEl("ok", {}, [], "input"), input, other))?.name).toBe("nickname");
  });

  it("sin campos inválidos va al FormMessage", () => {
    const message = new FakeEl("message", { "data-form-message": "" });
    expect(findErrorFocusTarget(form(new FakeEl("x"), message))?.name).toBe("message");
  });

  it("devuelve null si no hay nada que enfocar", () => {
    expect(findErrorFocusTarget(form(new FakeEl("x")))).toBeNull();
  });

  it("en un radiogroup enfoca la opción elegida", () => {
    const group = new FakeEl("group", { role: "radiogroup", "aria-invalid": "true" }, [
      radio("a"),
      radio("b", { "data-state": "checked" }),
      radio("c"),
    ]);
    expect(findErrorFocusTarget(form(group))?.name).toBe("b");
  });

  it("en un radiogroup sin elección enfoca la primera opción habilitada", () => {
    const group = new FakeEl("group", { role: "radiogroup", "aria-invalid": "true" }, [
      radio("a", { disabled: "" }),
      radio("b"),
      radio("c"),
    ]);
    expect(findErrorFocusTarget(form(group))?.name).toBe("b");
  });

  it("ignora una opción elegida pero deshabilitada", () => {
    const group = new FakeEl("group", { role: "radiogroup", "aria-invalid": "true" }, [
      radio("a", { disabled: "", "data-state": "checked" }),
      radio("b"),
    ]);
    expect(findErrorFocusTarget(form(group))?.name).toBe("b");
  });

  it("acepta un contenedor inválido que contiene radios (sin role=radiogroup)", () => {
    const wrapper = new FakeEl("wrapper", { "aria-invalid": "true" }, [
      new FakeEl("inner", { role: "radiogroup" }, [radio("a"), radio("b", { "aria-checked": "true" })]),
    ]);
    expect(findErrorFocusTarget(form(wrapper))?.name).toBe("b");
  });

  it("con radios nativos enfoca el marcado y salta los ocultos", () => {
    const native = (name: string, attrs: Record<string, string> = {}) =>
      new FakeEl(name, { type: "radio", ...attrs }, [], "input");
    const fieldset = new FakeEl("fieldset", { "aria-invalid": "true" }, [
      native("hidden", { "aria-hidden": "true", checked: "" }),
      native("a"),
      native("b", { checked: "" }),
    ]);
    expect(findErrorFocusTarget(form(fieldset))?.name).toBe("b");
  });

  it("si todas las opciones están deshabilitadas, devuelve el grupo", () => {
    const group = new FakeEl("group", { role: "radiogroup", "aria-invalid": "true" }, [radio("a", { disabled: "" })]);
    expect(findErrorFocusTarget(form(group))?.name).toBe("group");
  });
});
