import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DbService } from '../src/db/db.service';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let db: DbService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    db = app.get(DbService);
    await app.init();

    const passwordHash = await bcrypt.hash('testpass123', 10);
    const deactivatedHash = await bcrypt.hash('testpass123', 10);

    // Insert active teacher
    await db
      .insertInto('accounts')
      .values({
        email: 'test@example.com',
        password_hash: passwordHash,
        display_name: 'Test Teacher',
        role: 'teacher',
      })
      .execute();

    // Insert deactivated teacher
    await db
      .insertInto('accounts')
      .values({
        email: 'deactivated@example.com',
        password_hash: deactivatedHash,
        display_name: 'Deactivated Teacher',
        role: 'teacher',
        deactivated_at: new Date(),
      })
      .execute();
  });

  afterAll(async () => {
    await db
      .deleteFrom('accounts')
      .where('email', 'in', ['test@example.com', 'deactivated@example.com'])
      .execute();
    await app.close();
  });

  it('/auth/login (POST) - success', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'testpass123' })
      .expect(200)
      .expect((res) => {
        expect(res.body.token).toBeDefined();
      });
  });

  it('/auth/login (POST) - failure (wrong password)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' })
      .expect(401);
  });

  it('/auth/login (POST) - deactivated account', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'deactivated@example.com', password: 'testpass123' })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toEqual('Account deactivated');
      });
  });

  it('/auth/me (GET) - success', async () => {
    // first login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'testpass123' })
      .expect(200);

    const token = loginRes.body.token;

    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.role).toEqual('teacher');
      });
  });

  it('/auth/login (POST) - invalid schema', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'testpass123' })
      .expect(400);
  });
});
