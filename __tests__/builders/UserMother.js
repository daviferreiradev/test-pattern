import { User } from '../../src/domain/User.js';

export class UserMother {

  static umUsuarioPadrao() {
    return new User(
      1,
      'João Silva',
      'joao@email.com',
      'PADRAO'
    );
  }

  static umUsuarioPremium() {
    return new User(
      2,
      'Maria Premium',
      'premium@email.com',
      'PREMIUM'
    );
  }

  static umUsuarioComEmail(email) {
    return new User(
      3,
      'Usuário Teste',
      email,
      'PADRAO'
    );
  }
}
