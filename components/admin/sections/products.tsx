"use client";

import { useEffect, useMemo, useState } from "react";
import { api, imageUrl, uploadImage, useApi } from "../../../lib/client/api";
import { REFRESH } from "../../../lib/client/refresh";
import { useClients, useProducts } from "../../../lib/client/resources";
import type { Product, ProductOrder } from "../../../lib/client/types";
import { useAction } from "../../../lib/client/use-action";
import { PAYMENT_METHODS } from "../../../lib/domain/catalog";
import { formatDate } from "../../../lib/domain/dates";
import { centsToInput, formatMoney } from "../../../lib/domain/money";
import { ClientPicker } from "../client-picker";
import { Button, IconButton } from "../../ui/button";
import { Alert, AsyncContent, EmptyState, LoadingState } from "../../ui/feedback";
import { useFeedback } from "../../ui/feedback-provider";
import { CheckboxField, SelectField, TextAreaField, TextField } from "../../ui/field";
import { Icon } from "../../ui/icon";
import { Badge, PageHeader, Panel } from "../../ui/layout";
import { Modal } from "../../ui/modal";

const LOW_STOCK = 2;

export default function ProductsSection() {
  const products = useProducts();
  const orders = useApi<{ orders: ProductOrder[] }>("/api/product-orders");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [selling, setSelling] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Produtos"
        description="Estoque e vendas. Cada venda baixa o estoque e entra no caixa."
        actions={
          <Button variant="secondary" icon="plus" onClick={() => setEditing("new")}>
            Novo produto
          </Button>
        }
        primary={{ label: "Registrar venda", icon: "cash", onClick: () => setSelling(true) }}
      />

      <div className="stack">
        {orders.data && orders.data.orders.length > 0 && (
          <Panel eyebrow="Pedidos" title="Pedidos aguardando finalização">
            <div className="card-grid">
              {orders.data.orders.map((order) => (
                <PendingOrder key={order.id} order={order} />
              ))}
            </div>
          </Panel>
        )}

        <AsyncContent {...products} onRetry={products.reload}>
          {({ products: rows }) =>
            rows.length ? (
              <div className="product-grid">
                {rows.map((product) => (
                  <article key={product.id} className={`product-card ${product.active ? "" : "is-muted"}`}>
                    <div className="product-card__image">
                      {product.imageKey ? <img src={imageUrl(product.imageKey)} alt="" loading="lazy" /> : <Icon name="box" size={32} />}
                    </div>
                    <div className="product-card__body">
                      <div className="product-card__head">
                        <strong>{product.name}</strong>
                        <IconButton icon="edit" label={`Editar ${product.name}`} onClick={() => setEditing(product)} />
                      </div>
                      {product.description && <p>{product.description}</p>}
                      <div className="product-card__footer">
                        <strong>{formatMoney(product.priceCents)}</strong>
                        {!product.active ? (
                          <Badge>Inativo</Badge>
                        ) : product.stock === 0 ? (
                          <Badge tone="danger">Sem estoque</Badge>
                        ) : (
                          <Badge tone={product.stock <= LOW_STOCK ? "warning" : "success"}>{product.stock} em estoque</Badge>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon="box" title="Nenhum produto cadastrado" />
            )
          }
        </AsyncContent>
      </div>

      {editing && <ProductModal key={editing === "new" ? "new" : editing.id} product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {selling && <SaleModal onClose={() => setSelling(false)} />}
    </>
  );
}

function PendingOrder({ order }: { order: ProductOrder }) {
  const { busy, run } = useAction();
  const feedback = useFeedback();
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);

  const act = (body: object, success: string) =>
    run(() => api(`/api/product-orders/${order.id}`, { method: "PATCH", body }), { success, refresh: REFRESH.products });

  async function cancel() {
    if (await feedback.confirm({ title: "Cancelar pedido?", message: `O pedido #${order.id} será cancelado sem alterar o estoque.`, confirmLabel: "Cancelar pedido", danger: true })) {
      await act({ action: "cancel" }, "Pedido cancelado.");
    }
  }

  return (
    <article className="order-card">
      <header>
        <div>
          <small>Pedido #{order.id} · {formatDate(order.createdAt.slice(0, 10))}</small>
          <strong>{order.clientName}</strong>
        </div>
        <strong>{formatMoney(order.totalCents)}</strong>
      </header>
      <ul>
        {order.items.map((item) => (
          <li key={item.id}>
            <span>{item.quantity}× {item.productName}</span>
            <span>{formatMoney(item.priceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <footer>
        <select aria-label="Forma de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          {PAYMENT_METHODS.map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" disabled={busy} onClick={cancel}>
          Cancelar
        </Button>
        <Button size="sm" loading={busy} onClick={() => act({ action: "finalize", paymentMethod }, "Pedido finalizado e lançado no caixa.")}>
          Finalizar
        </Button>
      </footer>
    </article>
  );
}

function ProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { busy, run } = useAction();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? centsToInput(product.priceCents) : "",
    stock: String(product?.stock ?? 0),
    active: product?.active ?? true,
  });
  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => URL.revokeObjectURL(filePreview), [filePreview]);
  const preview = filePreview || (product?.imageKey ? imageUrl(product.imageKey) : "");

  async function submit() {
    const done = await run(
      async () => {
        const imageKey = file ? await uploadImage(file) : undefined;
        const body = { ...form, stock: Number(form.stock), ...(imageKey ? { imageKey } : {}) };
        return product ? api(`/api/products/${product.id}`, { method: "PATCH", body }) : api("/api/products", { method: "POST", body });
      },
      { success: "Produto salvo.", refresh: REFRESH.products },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title={product ? "Editar produto" : "Novo produto"}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <TextField className="form-grid__full" label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField label="Preço (R$)" inputMode="decimal" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        <TextField label="Estoque" type="number" min={0} required value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
        <TextAreaField className="form-grid__full" label="Descrição (opcional)" maxLength={1200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <div className="field form-grid__full">
          <span className="field__label">Foto</span>
          <div className="image-input">
            {preview ? <img src={preview} alt="Pré-visualização do produto" /> : <span className="image-input__empty"><Icon name="box" size={28} /></span>}
            <label className="button button--secondary button--sm file-input">
              <Icon name="upload" size={16} />
              <span>{preview ? "Trocar foto" : "Escolher foto"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <CheckboxField className="form-grid__full" label="Produto ativo (disponível para venda)" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
      </div>
    </Modal>
  );
}

function SaleModal({ onClose }: { onClose: () => void }) {
  const products = useProducts();
  const clients = useClients();
  const { busy, run } = useAction();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [clientEmail, setClientEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);

  const available = (products.data?.products ?? []).filter((product) => product.active && product.stock > 0);
  const items = available.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] }));
  const total = items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  function change(product: Product, delta: number) {
    setCart((current) => {
      const quantity = Math.max(0, Math.min(product.stock, (current[product.id] ?? 0) + delta));
      const next = { ...current };
      if (quantity) next[product.id] = quantity;
      else delete next[product.id];
      return next;
    });
  }

  async function submit() {
    const done = await run(
      () =>
        api("/api/product-orders", {
          method: "POST",
          body: { items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })), clientEmail, paymentMethod },
        }),
      { success: "Venda registrada: estoque atualizado e valor lançado no caixa.", refresh: REFRESH.products },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      size="lg"
      title="Registrar venda"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="modal__summary">Total: {formatMoney(total)}</span>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy} disabled={!items.length}>
            Confirmar venda
          </Button>
        </>
      }
    >
      {products.loading || clients.loading ? (
        <LoadingState />
      ) : (
        <div className="form-sections">
          {available.length ? (
            <ul className="sale-list">
              {available.map((product) => (
                <li key={product.id}>
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      {formatMoney(product.priceCents)} · {product.stock} em estoque
                    </small>
                  </span>
                  <span className="stepper">
                    <IconButton icon="minus" label={`Remover um ${product.name}`} disabled={!cart[product.id]} onClick={() => change(product, -1)} />
                    <output aria-label={`Quantidade de ${product.name}`}>{cart[product.id] ?? 0}</output>
                    <IconButton icon="plus" label={`Adicionar um ${product.name}`} disabled={(cart[product.id] ?? 0) >= product.stock} onClick={() => change(product, 1)} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Alert tone="warning">Nenhum produto com estoque disponível.</Alert>
          )}
          <div className="form-grid">
            <ClientPicker label="Cliente (opcional)" emptyLabel="Venda sem cliente" clients={clients.data?.clients ?? []} value={clientEmail} onChange={setClientEmail} />
            <SelectField label="Forma de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </SelectField>
          </div>
        </div>
      )}
    </Modal>
  );
}
