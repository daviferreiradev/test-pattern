import { Carrinho } from '../../src/domain/Carrinho.js';
import { Item } from '../../src/domain/Item.js';
import { UserMother } from './UserMother.js';

export class CarrinhoBuilder {

  constructor() {
    this.user = UserMother.umUsuarioPadrao();
    this.itens = [
      new Item('Produto Padrão', 100.00)
    ];
  }

  comUser(user) {
    this.user = user;
    return this;
  }

  comItens(itens) {
    this.itens = itens;
    return this;
  }

  adicionarItem(item) {
    this.itens.push(item);
    return this;
  }

  vazio() {
    this.itens = [];
    return this;
  }

  comValorTotal(valor) {
    this.itens = [new Item('Item Customizado', valor)];
    return this;
  }

  build() {
    return new Carrinho(this.user, this.itens);
  }
}
