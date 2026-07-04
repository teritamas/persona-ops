/**
 * ドメイン層の共通エラー型定義
 *
 * Why: 各層が Fastify や HTTP ステータスコードに依存せずにエラーを表現できるよう、
 * 純粋なドメインエラーとして定義する。HTTP へのマッピングは routes 層が担当する。
 */

export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';

  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" was not found.`);
  }
}

export class ValidationError extends Error {
  override readonly name = 'ValidationError';

  constructor(message: string) {
    super(message);
  }
}

export class ConflictError extends Error {
  override readonly name = 'ConflictError';

  constructor(message: string) {
    super(message);
  }
}
