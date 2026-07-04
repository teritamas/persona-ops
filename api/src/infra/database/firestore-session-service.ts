import type { Firestore } from '@google-cloud/firestore';
import type {
  CreateSessionRequest,
  DeleteSessionRequest,
  GetSessionRequest,
  ListSessionsRequest,
  ListSessionsResponse,
  Session,
  Event,
} from '@google/adk';
import { BaseSessionService, createSession } from '@google/adk';

export class FirestoreSessionService extends BaseSessionService {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async createSession(request: CreateSessionRequest): Promise<Session> {
    const sessionId = request.sessionId || `session_${Date.now()}`;
    const now = Date.now();
    const sessionData = {
      id: sessionId,
      appName: request.appName,
      userId: request.userId,
      state: request.state || {},
      lastUpdateTime: now,
    };

    await this.firestore.collection('sessions').doc(sessionId).set(sessionData);

    return createSession({
      id: sessionId,
      appName: request.appName,
      userId: request.userId,
      state: request.state || {},
      events: [],
      lastUpdateTime: now,
    });
  }

  async getSession(request: GetSessionRequest): Promise<Session | undefined> {
    const sessionDoc = await this.firestore
      .collection('sessions')
      .doc(request.sessionId)
      .get();

    if (!sessionDoc.exists) {
      return undefined;
    }

    const rawData = sessionDoc.data();
    if (!rawData) {
      return undefined;
    }
    const data = rawData as {
      appName: string;
      userId: string;
      state?: Record<string, unknown>;
      lastUpdateTime?: number;
    };
    if (data.userId !== request.userId || data.appName !== request.appName) {
      return undefined;
    }

    // イベントサブコレクションから読み込み
    const eventsSnapshot = await this.firestore
      .collection('sessions')
      .doc(request.sessionId)
      .collection('events')
      .orderBy('timestamp', 'asc')
      .get();

    const events: Event[] = [];
    eventsSnapshot.forEach((doc) => {
      events.push(doc.data() as Event);
    });

    return createSession({
      id: request.sessionId,
      appName: data.appName,
      userId: data.userId,
      state: data.state || {},
      events,
      lastUpdateTime: data.lastUpdateTime || Date.now(),
    });
  }

  async listSessions(
    request: ListSessionsRequest,
  ): Promise<ListSessionsResponse> {
    const snapshot = await this.firestore
      .collection('sessions')
      .where('appName', '==', request.appName)
      .where('userId', '==', request.userId)
      .get();

    const sessions: Session[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as {
        appName: string;
        userId: string;
        state?: Record<string, unknown>;
        lastUpdateTime?: number;
      };
      sessions.push(
        createSession({
          id: doc.id,
          appName: data.appName,
          userId: data.userId,
          state: data.state || {},
          events: [],
          lastUpdateTime: data.lastUpdateTime || Date.now(),
        }),
      );
    });

    return {
      sessions,
      page: 1,
      limit: sessions.length,
      totalItems: sessions.length,
      totalPages: sessions.length > 0 ? 1 : 0,
    };
  }

  async deleteSession(request: DeleteSessionRequest): Promise<void> {
    const sessionRef = this.firestore
      .collection('sessions')
      .doc(request.sessionId);

    // イベントサブコレクションを削除
    const eventsSnapshot = await sessionRef.collection('events').get();
    const batch = this.firestore.batch();
    eventsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // セッション自体を削除
    batch.delete(sessionRef);
    await batch.commit();
  }

  async appendEvent(request: {
    session: Session;
    event: Event;
  }): Promise<Event> {
    if (request.event.partial) {
      return request.event;
    }

    // 親クラスの appendEvent を呼ぶことで session.state が自動更新される
    const event = await super.appendEvent(request);

    const eventId = event.id || `event_${Date.now()}`;
    const sessionRef = this.firestore
      .collection('sessions')
      .doc(request.session.id);

    // Event オブジェクトを JSON シリアライズ可能なオブジェクトにして保存
    const eventJson = JSON.parse(JSON.stringify(event)) as Record<
      string,
      unknown
    >;

    await sessionRef.collection('events').doc(eventId).set(eventJson);

    // セッション状態を更新
    await sessionRef.update({
      lastUpdateTime: event.timestamp || Date.now(),
      state: request.session.state,
    });

    return event;
  }
}
