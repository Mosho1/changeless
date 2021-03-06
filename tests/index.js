const chai = require('chai');
const {expect} = chai;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const {default: imm, fns} = require('../src/index');
const { time } = require('./utils');
const _ = require('lodash');
const now = require('performance-now');

chai.use(sinonChai);
const {set, merge, withMutations} = imm;

beforeEach(() => {
    sinon.spy(console, 'warn');
    _.forEach(fns, (val, key) =>
        _.isFunction(val) && sinon.spy(fns, key));
});

afterEach(() => {
    console.warn.restore();
    _.forEach(fns, (val) =>
        _.isFunction(val) && val.restore());
});

describe('set', () => {
    it('should return a different object reference', () => {
        const obj = { a: 1 };
        const newObj = set(obj, 'a', 2);
        expect(obj).to.eql({ a: 1 });
        expect(newObj).to.not.equal(obj);
        expect(newObj).to.eql({ a: 2 });
        expect(fns.cloneObject).to.have.been.calledOnce;
    });

    it('should work with arrays', () => {
        const arr = [1];
        const newArr = imm(arr).set('0', 2).value();
        expect(arr).to.eql([1]);
        expect(newArr).to.not.equal(arr);
        expect(newArr[0]).to.equal(2);
        expect(fns.cloneArray).to.have.been.calledTwice;
    });

    it('should work with array path', () => {
        const obj = { a: { b: 1 } };
        const newObj = set(obj, 'a___b', 2);
        expect(obj).to.eql({ a: { b: 1 } });
        expect(newObj).to.not.equal(obj);
        expect(newObj.a).to.not.equal(obj.a);
        expect(newObj.a.b).to.equal(2);
        expect(fns.cloneObject).to.have.been.calledTwice;
    });

    it('should work with nested object/array', () => {
        const arr = [{ a: 2 }, { b: 3 }];
        const newArr = set(arr, '0___a', 3);
        expect(arr).to.eql([{ a: 2 }, { b: 3 }]);
        expect(newArr).to.not.equal(arr);
        expect(newArr).to.not.eql(arr);
        expect(newArr[0]).to.not.equal(arr[0]);
        expect(newArr[1]).to.equal(arr[1]);
        expect(newArr[1].b).to.equal(arr[1].b);
        expect(newArr[0].a).to.equal(3);
        expect(fns.cloneArray).to.have.been.calledOnce;
        expect(fns.cloneObject).to.have.been.calledOnce;
    });

    it('should not perform unnecessary mutations', () => {
        const arr = [{ a: 2 }, { b: 3 }];
        const newArr = set(arr, '0___a', 2);
        // expect(newArr).to.equal(arr);
        expect(newArr[0]).to.equal(arr[0]);
    });

});

describe('merge', () => {

    it('should work with null values', () => {
        const obj1 = { a: null, b: null, d: { e: null } };
        const obj2 = { a: null, c: null, d: { e: 6 } };
        const ref2 = obj2;
        const merged = merge(obj1, obj2);
        expect(merged).to.not.equal(obj1);
        expect(merged).to.eql({ a: null, b: null, c: null, d: { e: 6 } });
    });

    it('should merge two objects', () => {
        const obj1 = { a: 1, b: 2, d: { e: 4 } };
        const obj2 = { a: 2, c: 3, d: { e: 6 } };
        const ref2 = obj2;
        const merged = merge(obj1, obj2);
        expect(merged).to.not.equal(obj1);
        expect(merged).to.not.equal(obj1);
        expect(obj1).to.eql({ a: 1, b: 2, d: { e: 4 } });
        expect(obj2).to.equal(ref2);
        expect(obj2.d).to.equal(ref2.d);
        expect(obj2).to.eql({ a: 2, c: 3, d: { e: 6 } });
        expect(merged).to.eql({ a: 2, b: 2, c: 3, d: { e: 6 } });
        expect(fns.cloneObject).to.have.been.calledTwice;

        // warning is about settings new property on an object
        expect(console.warn).to.have.been.calledOnce;
    });

    it('should merge two objects shallowly', () => {
        const obj1 = { a: 1, b: { d: 4 } };
        const obj2 = { a: 2 };
        const merged = merge(obj1, obj2);
        expect(merged).to.eql({ a: 2, b: { d: 4 } });
        expect(merged.b).to.equal(obj1.b);
        expect(fns.cloneObject).to.have.been.calledOnce;
    });

    it('should merge two arrays', () => {
        const arr1 = [1, 2, [3, 4]];
        const arr2 = [2, 2, [4]];
        const merged = merge(arr1, arr2);
        expect(merged).to.not.equal(arr1);
        expect(merged).to.not.equal(arr1);
        expect(merged).to.eql([2, 2, [4, 4]]);
        expect(fns.cloneArray).to.have.been.calledTwice;
    });

    it('should merge two arrays shallowly', () => {
        const arr1 = [1, 2, [3, 4]];
        const arr2 = [2, 2];
        const merged = merge(arr1, arr2);
        expect(merged[2]).to.equal(arr1[2]);
        expect(merged).to.eql([2, 2, [3, 4]]);
        expect(fns.cloneArray).to.have.been.calledOnce;
    });

    it('should merge mixed objects', () => {

        const users = {
            'data': [{ 'user': 'barney' }, { 'user': 'fred' }]
        };

        const ages1 = {
            'data': [{ 'age': 36 }]
        };

        const ages2 = {
            'data': [{ 'age': 30 }, { 'age': 40 }]
        };
        const merged = imm(users).merge(ages1, ages2).value();
        expect(merged).to.eql({ 'data': [{ 'user': 'barney', 'age': 30 }, { 'user': 'fred', 'age': 40 }] });
        expect(fns.cloneArray).to.have.been.calledTwice;
        expect(fns.cloneObject).to.have.been.calledThrice;

        // warning is about settings new property on an object
        expect(console.warn).to.have.been.calledTwice;
    });

    it('should work with paths (mergeIn)', () => {
        const target = { a: { x: { y: 0 }, b: { c: { d: 2 } } } };

        const source = { c: { d: 3 } };
        const merged = merge(target, 'a___b', source);

        expect(target).to.eql({ a: { x: { y: 0 }, b: { c: { d: 2 } } } });
        expect(merged).to.eql({ a: { x: { y: 0 }, b: { c: { d: 3 } } } });
        expect(merged.a).to.not.equal(target.a);
        expect(merged.a.b).to.not.equal(target.a.b);
        expect(merged.a.x).to.equal(target.a.x);
        expect(fns.cloneObject).to.have.callCount(4);
    });
});

describe('withMutations', () => {

    it('should apply multiple mutations', () => {
        const obj = { a: 1, b: 2, c: 3 };
        const newObj = withMutations(obj, o => {
            o.set('a', 2).set('b', 1);
        });

        expect(obj).to.eql({ a: 1, b: 2, c: 3 });
        expect(newObj).to.eql({ a: 2, b: 1, c: 3 });
        expect(fns.cloneObject).to.have.been.calledOnce;
    });

    it('should apply multiple deep mutations', () => {
        const obj = [{ a: 1, b: [1, 2], c: 3 }, { a: 4, d: 5 }];
        const newObj = imm(obj).withMutations(o => {
            o.set('0___a', 2).set('1___d', 0);
        }).value();

        expect(obj).to.eql([{ a: 1, b: [1, 2], c: 3 }, { a: 4, d: 5 }]);
        expect(newObj).to.eql([{ a: 2, b: [1, 2], c: 3 }, { a: 4, d: 0 }]);
        expect(fns.cloneObject).to.have.been.calledTwice;
        expect(fns.cloneArray).to.have.been.calledTwice;
        expect(newObj[0]).to.not.equal(obj[0]);
        expect(newObj[0].b).to.equal(obj[0].b);
    });

});

describe('general tests', () => {
    it('should not break with normal JS assignment', () => {
        const obj = {a: 1};
        const newObj = set(obj, 'a', 2);
        newObj.b = 5;
        const newerObj = merge(newObj, {a: 1, b: 1});
        expect(newerObj).to.eql({a: 1 , b:1 });
    });
});
