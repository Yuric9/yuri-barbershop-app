-- Trava de estoque: nenhuma atualização pode deixar um produto com estoque
-- negativo. Se acontecer (duas vendas do último item ao mesmo tempo), o banco
-- cancela a operação inteira, inclusive o lançamento no caixa.
CREATE TRIGGER IF NOT EXISTS `products_stock_non_negative`
BEFORE UPDATE OF `stock` ON `products`
WHEN NEW.`stock` < 0
BEGIN
  SELECT RAISE(ABORT, 'estoque_insuficiente');
END;
