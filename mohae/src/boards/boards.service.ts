import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryRepository } from 'src/categories/repository/category.repository';
import { AreasRepository } from 'src/areas/repository/area.repository';
import { DeleteResult, RelationId } from 'typeorm';
import {
  CreateBoardDto,
  SearchBoardDto,
  UpdateBoardDto,
} from './dto/board.dto';
import { Board } from './entity/board.entity';
import { BoardRepository } from './repository/board.repository';
import { ErrorConfirm } from 'src/utils/error';
import { UserRepository } from 'src/auth/repository/user.repository';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(BoardRepository)
    private boardRepository: BoardRepository,

    @InjectRepository(AreasRepository)
    private areaRepository: AreasRepository,

    @InjectRepository(CategoryRepository)
    private categoryRepository: CategoryRepository,

    @InjectRepository(UserRepository)
    private userRepository: UserRepository,

    private errorConfirm: ErrorConfirm,
  ) {}

  async getAllBoards(): Promise<Board[]> {
    const boards = await this.boardRepository.getAllBoards();
    this.errorConfirm.notFoundError(boards, '게시글을 찾을 수 없습니다.');

    const currentTime = new Date();
    currentTime.setHours(currentTime.getHours() + 9);

    const { affected } = await this.boardRepository.closingBoard(currentTime);
    if (!affected) {
      throw new InternalServerErrorException('게시글 마감이 되지 않았습니다');
    }

    return boards;
  }

  async likeBoard({ boardNo, userNo, judge }) {
    const board = await this.boardRepository.findOne(boardNo, {
      relations: ['likedUser'],
    });
    this.errorConfirm.notFoundError(board, '게시글을 찾을 수 없습니다.');

    const user = await this.userRepository.findOne(userNo);
    this.errorConfirm.notFoundError(user, '회원을 찾을 수 없습니다.');

    const findUser = board.likedUser.find(
      (thumbUser) => thumbUser.no === user.no,
    );

    if ((findUser && judge) || (!findUser && !judge)) {
      return {
        success: false,
        msg: '좋아요가 중복되었거나 좋아요 취소가 실패하였습니다.',
      };
    }

    if (!findUser) {
      board.likedUser.push(user);

      await this.boardRepository.save(board);

      return {
        success: true,
        msg: '좋아요 등록',
      };
    }

    for (let i = 0; i < board.likedUser.length; i++) {
      if (board.likedUser[i].no === userNo) {
        board.likedUser.splice(i, 1);
      }
    }

    await this.boardRepository.save(board);

    return {
      success: true,
      msg: '좋아요 취소',
    };
  }

  async filteredBoards(
    sort: any,
    popular: string,
    areaNo: number,
    categoryNo: number,
    max: number,
    min: number,
    target: boolean,
    date: string,
    free: string,
  ): Promise<Board[]> {
    const currentTime = new Date();
    currentTime.setHours(currentTime.getHours() + 9);

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 9);

    switch (date) {
      case '0':
        endTime.setDate(endTime.getDate() + 7);
        break;
      case '1':
        endTime.setMonth(endTime.getMonth() + 1);
        break;
      case '2':
        endTime.setMonth(endTime.getMonth() + 3);
        break;
      case '3':
        endTime.setFullYear(endTime.getFullYear() + 1);
        break;
    }

    const boards = await this.boardRepository.filteredBoards(
      sort,
      popular,
      areaNo,
      categoryNo,
      max,
      min,
      target,
      date,
      endTime,
      currentTime,
      free,
    );

    this.errorConfirm.notFoundError(
      boards.length,
      '필터링된 게시글을 찾을 수 없습니다.',
    );

    return boards;
  }

  async readHotBoards(): Promise<Board[]> {
    const boards = await this.boardRepository.readHotBoards();
    this.errorConfirm.notFoundError(boards, '게시글을 찾을 수 없습니다.');

    return boards;
  }

  async getByOneBoard(no: number) {
    const { board, likeCount } = await this.boardRepository.getByOneBoard(no);
    this.errorConfirm.notFoundError(board, `해당 게시글을 찾을 수 없습니다.`);

    const boardHit = await this.boardRepository.addBoardHit(no, board);

    if (!boardHit) {
      throw new InternalServerErrorException(
        '게시글 조회 수 증가가 되지 않았습니다',
      );
    }

    const currentTime = new Date();
    currentTime.setHours(currentTime.getHours() + 9);

    const { affected } = await this.boardRepository.closingBoard(currentTime);
    if (!affected) {
      throw new InternalServerErrorException('게시글 마감이 되지 않았습니다');
    }

    return { board, likeCount };
  }

  async boardClosed(no: number): Promise<object> {
    const board = await this.boardRepository.findOne(no);
    this.errorConfirm.notFoundError(board, '게시글을 찾을 수 없습니다.');
    if (board.isDeadline) {
      throw new InternalServerErrorException('마감된 게시글 입니다.');
    }

    const result = await this.boardRepository.boardClosed(no);
    if (!result) {
      throw new InternalServerErrorException('게시글 마감이 되지 않았습니다');
    }

    return { success: true };
  }

  async cancelClosedBoard(no: number): Promise<object> {
    const board = await this.boardRepository.findOne(no);
    this.errorConfirm.notFoundError(board, `해당 게시글을 찾을 수 없습니다.`);
    if (!board.isDeadline) {
      throw new InternalServerErrorException('활성화된 게시글 입니다.');
    }

    const result = await this.boardRepository.cancelClosedBoard(no);

    if (!result) {
      throw new InternalServerErrorException(
        '게시글 마감 취소가 되지 않았습니다.',
      );
    }

    return { success: true };
  }

  async searchAllBoards(searchBoardDto: SearchBoardDto): Promise<Board[]> {
    const boards = await this.boardRepository.searchAllBoards(searchBoardDto);
    this.errorConfirm.notFoundError(boards, '게시글을 찾을 수 없습니다.');

    return boards;
  }

  async createBoard(createBoardDto: CreateBoardDto): Promise<Board> {
    const { categoryNo, areaNo, deadline, userNo } = createBoardDto;
    const category = await this.categoryRepository.findOne(categoryNo, {
      relations: ['boards'],
    });

    const area = await this.areaRepository.findOne(areaNo, {
      relations: ['boards'],
    });

    const user = await this.userRepository.findOne(userNo, {
      relations: ['boards'],
    });

    this.errorConfirm.notFoundError(
      category,
      `해당 카테고리를 찾을 수 없습니다.`,
    );

    this.errorConfirm.notFoundError(area, `해당 지역을 찾을 수 없습니다.`);

    this.errorConfirm.notFoundError(user, `해당 회원을 찾을 수 없습니다.`);

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 9);

    switch (deadline) {
      case 0:
        endTime.setDate(endTime.getDate() + 7);
        break;
      case 1:
        endTime.setMonth(endTime.getMonth() + 1);
        break;
      case 2:
        endTime.setMonth(endTime.getMonth() + 3);
        break;
      case 3:
        endTime.setFullYear(endTime.getFullYear() + 100);
        break;
    }

    const board = await this.boardRepository.createBoard(
      category,
      area,
      user,
      createBoardDto,
      endTime,
    );

    category.boards.push(board);

    return board;
  }

  async deleteBoard(no: number): Promise<DeleteResult> {
    const board = await this.boardRepository.findOne(no);
    this.errorConfirm.notFoundError(board, `해당 게시글을 찾을 수 없습니다.`);

    const result = await this.boardRepository.deleteBoard(no);

    if (!result.affected) {
      throw new InternalServerErrorException(
        '해당 게시글이 삭제되지 않았습니다.',
      );
    }

    return result;
  }

  async updateBoard(
    no: number,
    updateBoardDto: UpdateBoardDto,
  ): Promise<Object> {
    const { categoryNo, areaNo, deadline } = updateBoardDto;
    const category = await this.categoryRepository.findOne(categoryNo, {
      relations: ['boards'],
    });

    const area = await this.areaRepository.findOne(areaNo, {
      relations: ['boards'],
    });

    this.errorConfirm.notFoundError(
      category,
      `해당 카테고리를 찾을 수 없습니다.`,
    );

    this.errorConfirm.notFoundError(area, `해당 지역을 찾을 수 없습니다.`);

    const board = await this.boardRepository.findOne(no);
    this.errorConfirm.notFoundError(board, `해당 게시글을 찾을 수 없습니다.`);

    const endTime = new Date(board.createdAt);

    switch (deadline) {
      case 0:
        endTime.setDate(endTime.getDate() + 7);
        break;
      case 1:
        endTime.setMonth(endTime.getMonth() + 1);
        break;
      case 2:
        endTime.setMonth(endTime.getMonth() + 3);
        break;
      case 3:
        endTime.setFullYear(endTime.getFullYear() + 100);
        break;
    }

    const currentTime = new Date();
    currentTime.setHours(currentTime.getHours() + 9);

    if (endTime <= currentTime) {
      throw new BadRequestException('다른 기간을 선택해 주십시오');
    }

    const updatedBoard = await this.boardRepository.updateBoard(
      no,
      category,
      area,
      updateBoardDto,
      endTime,
    );

    if (updatedBoard) {
      return { success: true };
    }

    return { success: false };
  }
}
