import { CheckoutService } from '../src/services/CheckoutService.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { UserMother } from './builders/UserMother.js';
import { Item } from '../src/domain/Item.js';

describe('CheckoutService', () => {

  describe('quando o pagamento falha', () => {

    it('deve retornar null e não processar o pedido', async () => {
      const carrinho = new CarrinhoBuilder()
        .comValorTotal(100.00)
        .build();

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({
          success: false
        })
      };

      const repositoryDummy = {
        salvar: jest.fn()
      };

      const emailServiceDummy = {
        enviarEmail: jest.fn()
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryDummy,
        emailServiceDummy
      );

      const cartaoCredito = '1234-5678-9012-3456';

      const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

      expect(pedido).toBeNull();
      expect(gatewayStub.cobrar).toHaveBeenCalledWith(100.00, cartaoCredito);
      expect(repositoryDummy.salvar).not.toHaveBeenCalled();
      expect(emailServiceDummy.enviarEmail).not.toHaveBeenCalled();
    });
  });

  describe('quando um cliente Premium finaliza a compra', () => {

    it('deve aplicar desconto de 10% e notificar por email', async () => {
      const usuarioPremium = UserMother.umUsuarioPremium();

      const carrinho = new CarrinhoBuilder()
        .comUser(usuarioPremium)
        .comItens([
          new Item('Notebook', 150.00),
          new Item('Mouse', 50.00)
        ])
        .build();

      expect(carrinho.calcularTotal()).toBe(200.00);

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({
          success: true
        })
      };

      const repositoryStub = {
        salvar: jest.fn().mockImplementation((pedido) => {
          return { ...pedido, id: 123 };
        })
      };

      const emailMock = {
        enviarEmail: jest.fn().mockResolvedValue(true)
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryStub,
        emailMock
      );

      const cartaoCredito = '1234-5678-9012-3456';

      const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

      expect(pedido).not.toBeNull();
      expect(pedido.id).toBe(123);
      expect(pedido.status).toBe('PROCESSADO');

      const valorComDesconto = 180.00;
      expect(pedido.totalFinal).toBe(valorComDesconto);

      expect(gatewayStub.cobrar).toHaveBeenCalledTimes(1);
      expect(gatewayStub.cobrar).toHaveBeenCalledWith(valorComDesconto, cartaoCredito);

      expect(repositoryStub.salvar).toHaveBeenCalledTimes(1);

      expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
      expect(emailMock.enviarEmail).toHaveBeenCalledWith(
        'premium@email.com',
        'Seu Pedido foi Aprovado!',
        'Pedido 123 no valor de R$180'
      );
    });
  });

  describe('quando um cliente Padrão finaliza a compra', () => {

    it('deve processar sem desconto', async () => {
      const usuarioPadrao = UserMother.umUsuarioPadrao();

      const carrinho = new CarrinhoBuilder()
        .comUser(usuarioPadrao)
        .comValorTotal(200.00)
        .build();

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: true })
      };

      const repositoryStub = {
        salvar: jest.fn().mockImplementation((pedido) => {
          return { ...pedido, id: 456 };
        })
      };

      const emailMock = {
        enviarEmail: jest.fn().mockResolvedValue(true)
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryStub,
        emailMock
      );

      const cartaoCredito = '9999-8888-7777-6666';

      const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

      expect(pedido.totalFinal).toBe(200.00);
      expect(gatewayStub.cobrar).toHaveBeenCalledWith(200.00, cartaoCredito);
      expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
      expect(emailMock.enviarEmail).toHaveBeenCalledWith(
        'joao@email.com',
        'Seu Pedido foi Aprovado!',
        'Pedido 456 no valor de R$200'
      );
    });
  });

  describe('quando o carrinho está vazio', () => {

    it('deve processar com valor zero', async () => {
      const carrinho = new CarrinhoBuilder()
        .vazio()
        .build();

      expect(carrinho.calcularTotal()).toBe(0);

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: true })
      };

      const repositoryStub = {
        salvar: jest.fn().mockImplementation((pedido) => {
          return { ...pedido, id: 789 };
        })
      };

      const emailMock = {
        enviarEmail: jest.fn().mockResolvedValue(true)
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryStub,
        emailMock
      );

      const pedido = await checkoutService.processarPedido(carrinho, '0000-0000-0000-0000');

      expect(pedido).not.toBeNull();
      expect(pedido.totalFinal).toBe(0);
      expect(gatewayStub.cobrar).toHaveBeenCalledWith(0, '0000-0000-0000-0000');
    });
  });

  describe('quando o envio de email falha', () => {

    it('deve processar o pedido mesmo assim', async () => {
      const carrinho = new CarrinhoBuilder()
        .comValorTotal(100.00)
        .build();

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: true })
      };

      const repositoryStub = {
        salvar: jest.fn().mockImplementation((pedido) => {
          return { ...pedido, id: 999 };
        })
      };

      const emailMock = {
        enviarEmail: jest.fn().mockRejectedValue(new Error('Servidor de email indisponível'))
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryStub,
        emailMock
      );

      const pedido = await checkoutService.processarPedido(carrinho, '1111-2222-3333-4444');

      expect(pedido).not.toBeNull();
      expect(pedido.id).toBe(999);
      expect(pedido.status).toBe('PROCESSADO');

      expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Falha ao enviar e-mail',
        'Servidor de email indisponível'
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
