# Copyright (c) MLCommons and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
from fastapi import APIRouter

from app.domain.schemas.base.task import GetDynaboardInfoByTaskIdRequest
from app.domain.services.base.task import TaskService


router = APIRouter()


@router.get("/get_active_tasks_with_round_info", response_model={})
async def get_active_tasks_with_round_info():
    return TaskService().get_active_tasks_with_round_info()


@router.get("/get_task_id_by_task_code/{task_code}", response_model={})
async def get_task_id_by_task_code(task_code: str):
    return TaskService().get_task_id_by_task_code(task_code)


@router.get("/get_task_with_round_info_by_task_id/{task_id}", response_model={})
async def get_task_with_round_info_by_task_id(task_id: int):
    return TaskService().get_task_with_round_info_by_task_id(task_id)


@router.get("/get_order_datasets_by_task_id/{task_id}", response_model={})
async def get_order_datasets_by_task_id(task_id: int):
    return TaskService().get_order_datasets_by_task_id(task_id)


@router.get("/get_order_scoring_datasets_by_task_id/{task_id}", response_model={})
async def get_order_scoring_datasets_by_task_id(task_id: int):
    return TaskService().get_order_scoring_datasets_by_task_id(task_id)


@router.get("/get_order_metrics_by_task_id/{task_id}", response_model={})
async def get_order_metrics_by_task_id(task_id: int):
    return TaskService().get_order_metrics_by_task_id(task_id)


@router.get("/get_active_dataperf_tasks", response_model={})
async def get_active_dataperf_tasks():
    return TaskService().get_active_dataperf_tasks()


@router.post("/get_dynaboard_info_by_task_id/", response_model={})
async def get_dynaboard_info_by_task_id(model: GetDynaboardInfoByTaskIdRequest):
    return TaskService().get_dynaboard_info_by_task_id(
        model.task_id,
        model.ordered_metric_weights,
        model.ordered_scoring_dataset_weights,
        model.sort_by,
        model.sort_direction,
        model.offset,
        model.limit,
    )